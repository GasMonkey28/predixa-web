import {
  OPTION_DT_LOOSE_FILTERS,
  OPTION_DT_MAX_DTE_TRADING_DAYS,
  OPTION_DT_PRICE_MAX,
  OPTION_DT_PRICE_MIN,
  OPTION_DT_PRICE_SOFT_MAX,
  OPTION_DT_PRICE_SOFT_MIN,
  OPTION_DT_PRICE_TARGET,
  OPTION_DT_PREMIUM_LABEL,
  OPTION_DT_SCORE_LINE,
  OPTION_DT_SIDE_BUDGET,
  type OptionDtCandidate,
  type OptionDtPlanResponse,
  type OptionDtSide,
  type OptionDtSidePlan,
} from '@/lib/option-dt'
import { buildTickerRanks } from '@/lib/server/ticker-ranks'
import {
  collectOptionChainSnapshotDetailed,
  fetchOptionExpirations,
  fetchQuoteSnapshots,
  type TradeStationOptionChainRow,
} from '@/lib/server/tradestation-client'
import type { TickerRankRow } from '@/lib/ticker-ranks'

function toNum(value: string | number | undefined | null): number | undefined {
  if (value == null || value === '') return undefined
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : undefined
}

/** Calendar date YYYY-MM-DD in America/Chicago. */
export function todayEtYmd(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

function parseYmd(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

/** Count Mon–Fri sessions from startYmd (inclusive) to endYmd (inclusive). 0DTE → 0. */
export function tradingDaysBetween(startYmd: string, endYmd: string): number {
  const start = parseYmd(startYmd)
  const end = parseYmd(endYmd)
  if (end < start) return -1
  let count = 0
  const cursor = new Date(start)
  while (cursor <= end) {
    const dow = cursor.getUTCDay()
    if (dow !== 0 && dow !== 6) count += 1
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return Math.max(0, count - 1)
}

/** TradeStation option chain expiration query: MM-DD-YYYY */
export function toTsExpirationParam(ymd: string): string {
  const [y, m, d] = ymd.split('-')
  return `${m}-${d}-${y}`
}

function expirationYmd(raw: string): string | null {
  const m = raw.match(/^(\d{4}-\d{2}-\d{2})/)
  if (m) return m[1]
  const m2 = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/)
  if (m2) return `${m2[3]}-${m2[1]}-${m2[2]}`
  return null
}

function pickPremium(row: TradeStationOptionChainRow): number | undefined {
  const candidates = [row.Ask, row.Mid, row.Last, row.Bid, row.Close, row.PreviousClose]
  for (const value of candidates) {
    const n = toNum(value)
    if (n != null && n > 0) return n
  }
  return undefined
}

function inBand(price: number, min: number, max: number): boolean {
  return price >= min && price <= max
}

interface ScoredContract {
  row: TradeStationOptionChainRow
  symbol: string
  strike: number
  expiration: string
  premium: number
  oi: number
  /** Absolute distance from spot (ATM preference). */
  atmDistance: number
  preferredBand: boolean
}

function scoreContracts(
  rows: TradeStationOptionChainRow[],
  underlyingLast: number,
  loose: boolean
): ScoredContract[] {
  const scored: ScoredContract[] = []

  for (const row of rows) {
    const leg = row.Legs?.[0]
    const symbol = leg?.Symbol || row.Symbol
    const strike = toNum(leg?.StrikePrice ?? row.StrikePrice ?? row.Strikes?.[0])
    const exp =
      expirationYmd(leg?.Expiration || '') ||
      expirationYmd(row.ExpirationDate || '') ||
      null
    const premium = pickPremium(row)
    const oi = toNum(row.DailyOpenInterest) ?? toNum(row.OpenInterest) ?? 0
    if (!symbol || strike == null) continue
    // Loose: allow missing premium/expiration
    if (!loose && (premium == null || premium <= 0 || !exp)) continue

    const atmDistance = Math.abs(strike - underlyingLast)

    scored.push({
      row,
      symbol,
      strike,
      expiration: exp || todayEtYmd(),
      premium: premium ?? 0,
      oi,
      atmDistance,
      preferredBand:
        premium != null && inBand(premium, OPTION_DT_PRICE_MIN, OPTION_DT_PRICE_MAX),
    })
  }

  let pool = scored
  if (!loose) {
    const preferred = scored.filter((c) => c.preferredBand)
    pool =
      preferred.length > 0
        ? preferred
        : scored.filter((c) =>
            inBand(c.premium, OPTION_DT_PRICE_SOFT_MIN, OPTION_DT_PRICE_SOFT_MAX)
          )
  }

  // ATM first, then highest OI, then premium closest to target (strict mode)
  pool.sort((a, b) => {
    if (a.atmDistance !== b.atmDistance) return a.atmDistance - b.atmDistance
    if (b.oi !== a.oi) return b.oi - a.oi
    if (!loose) {
      return Math.abs(a.premium - OPTION_DT_PRICE_TARGET) - Math.abs(b.premium - OPTION_DT_PRICE_TARGET)
    }
    return 0
  })

  return pool
}

async function pickBestContractForTicker(input: {
  accessToken: string
  ticker: string
  side: OptionDtSide
  todayYmd: string
}): Promise<
  | { ok: true; contract: ScoredContract; underlyingLast: number; dte: number }
  | { ok: false; reason: string }
> {
  const { accessToken, ticker, side, todayYmd } = input
  const optionType = side === 'long' ? 'Call' : 'Put'
  const loose = OPTION_DT_LOOSE_FILTERS

  let quotes
  try {
    quotes = await fetchQuoteSnapshots(accessToken, [ticker])
  } catch (error) {
    return { ok: false, reason: `Quote failed: ${(error as Error).message}` }
  }

  const quote = quotes[0]
  const underlyingLast =
    toNum(quote?.Last) ?? toNum(quote?.Ask) ?? toNum(quote?.Close) ?? toNum(quote?.PreviousClose)
  if (underlyingLast == null || underlyingLast <= 0) {
    return { ok: false, reason: 'No underlying last price' }
  }

  let expirations
  try {
    expirations = await fetchOptionExpirations(accessToken, ticker)
  } catch (error) {
    return { ok: false, reason: `Expirations failed: ${(error as Error).message}` }
  }

  const eligible = expirations
    .map((e) => {
      const ymd = expirationYmd(e.Date)
      if (!ymd) return null
      const dte = tradingDaysBetween(todayYmd, ymd)
      if (dte < 0) return null
      if (!loose && dte > OPTION_DT_MAX_DTE_TRADING_DAYS) return null
      return { ymd, dte, type: e.Type }
    })
    .filter(Boolean) as Array<{ ymd: string; dte: number; type?: string }>

  eligible.sort((a, b) => a.dte - b.dte)

  if (eligible.length === 0) {
    return {
      ok: false,
      reason: loose
        ? 'No upcoming option expirations'
        : `No expirations within ${OPTION_DT_MAX_DTE_TRADING_DAYS} trading days`,
    }
  }

  let best: ScoredContract | null = null
  let bestDte = 0
  const expLimit = loose ? 6 : 4
  const diagnostics: string[] = []

  // Also try default next expiration (omit expiration param) once up front in loose mode
  const attempts: Array<{ ymd: string | null; dte: number; label: string }> = [
    ...eligible.slice(0, expLimit).map((e) => ({
      ymd: e.ymd as string | null,
      dte: e.dte,
      label: e.ymd,
    })),
  ]
  if (loose) {
    attempts.unshift({ ymd: null, dte: eligible[0]?.dte ?? 0, label: 'default-next' })
  }

  for (const exp of attempts) {
    let detail
    try {
      detail = await collectOptionChainSnapshotDetailed(
        accessToken,
        ticker,
        {
          expiration: exp.ymd ? toTsExpirationParam(exp.ymd) : undefined,
          optionType,
          strikeRange: loose ? 'All' : 'OTM',
          strikeProximity: loose ? 15 : 10,
          enableGreeks: false,
        },
        { timeoutMs: 12_000 }
      )
    } catch (error) {
      diagnostics.push(`${exp.label}: ${(error as Error).message}`)
      continue
    }

    diagnostics.push(
      `${exp.label}: http=${detail.httpStatus} bytes=${detail.rawBytes} rows=${detail.rows.length} hb=${detail.heartbeatCount} parseErr=${detail.parseErrors}` +
        (detail.streamErrors.length ? ` err=${detail.streamErrors[0]}` : '') +
        (detail.sampleKeys.length ? ` keys=${detail.sampleKeys.join('|')}` : '')
    )

    const ranked = scoreContracts(detail.rows, underlyingLast, loose)
    if (ranked.length === 0) continue

    const candidate = ranked[0]
    if (
      !best ||
      exp.dte < bestDte ||
      (exp.dte === bestDte &&
        (candidate.oi > best.oi ||
          (candidate.oi === best.oi && candidate.atmDistance < best.atmDistance)))
    ) {
      best = candidate
      bestDte = exp.dte
      if (exp.dte <= 2 || exp.ymd == null) break
    }
  }

  if (!best) {
    const hint = diagnostics.slice(0, 3).join(' · ')
    return {
      ok: false,
      reason: loose
        ? `No option contracts from chain (${hint || 'empty'})`
        : `No OTM contract in ${OPTION_DT_PREMIUM_LABEL} band`,
    }
  }

  return { ok: true, contract: best, underlyingLast, dte: bestDte }
}

function allocateSide(input: {
  side: OptionDtSide
  rows: TickerRankRow[]
  picks: Map<string, { contract: ScoredContract; underlyingLast: number; dte: number }>
  skips: Map<string, string>
}): OptionDtSidePlan {
  const { side, rows, picks, skips } = input
  const loose = OPTION_DT_LOOSE_FILTERS
  const above = rows
    .filter((r) => (r.score ?? Number.NEGATIVE_INFINITY) >= OPTION_DT_SCORE_LINE)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))

  const skipped: OptionDtSidePlan['skipped'] = []
  const candidates: OptionDtCandidate[] = []
  let remaining = OPTION_DT_SIDE_BUDGET

  for (const row of above) {
    const skipReason = skips.get(row.ticker)
    if (skipReason) {
      skipped.push({ ticker: row.ticker, score: row.score ?? 0, reason: skipReason })
      continue
    }

    const pick = picks.get(row.ticker)
    if (!pick) {
      skipped.push({ ticker: row.ticker, score: row.score ?? 0, reason: 'No contract selected' })
      continue
    }

    const ask = toNum(pick.contract.row.Ask) ?? pick.contract.premium
    const costPer = Math.round(Math.max(ask, 0) * 100 * 100) / 100

    let quantity = 1
    if (!loose) {
      if (costPer <= 0) {
        skipped.push({
          ticker: row.ticker,
          score: row.score ?? 0,
          reason: 'No usable premium for sizing',
        })
        continue
      }
      if (costPer > remaining) {
        skipped.push({
          ticker: row.ticker,
          score: row.score ?? 0,
          reason: `Need $${costPer.toFixed(0)} but only $${remaining.toFixed(0)} left`,
        })
        continue
      }
      const maxQty = Math.floor(remaining / costPer)
      quantity = Math.max(1, Math.min(maxQty, 5))
    }

    const estimatedCost = Math.round(quantity * costPer * 100) / 100
    if (!loose) {
      remaining = Math.round((remaining - estimatedCost) * 100) / 100
    } else {
      remaining = Math.round((remaining - Math.min(estimatedCost, remaining)) * 100) / 100
    }

    const moneyness =
      side === 'long'
        ? pick.contract.strike >= pick.underlyingLast
          ? 'OTM/ATM call'
          : 'ITM call'
        : pick.contract.strike <= pick.underlyingLast
          ? 'OTM/ATM put'
          : 'ITM put'

    candidates.push({
      id: `${side}:${row.ticker}:${pick.contract.symbol}`,
      side,
      ticker: row.ticker,
      summaryScore: row.score ?? 0,
      mixScore: row.mix_score,
      hands: row.position_size,
      signal: row.signal,
      underlyingLast: pick.underlyingLast,
      optionSymbol: pick.contract.symbol,
      optionType: side === 'long' ? 'Call' : 'Put',
      strike: pick.contract.strike,
      expiration: pick.contract.expiration,
      expirationLabel: pick.contract.expiration,
      dteTradingDays: pick.dte,
      bid: toNum(pick.contract.row.Bid),
      ask: ask > 0 ? ask : undefined,
      mid: toNum(pick.contract.row.Mid) ?? (pick.contract.premium || undefined),
      openInterest: pick.contract.oi,
      costPerContract: costPer,
      quantity,
      estimatedCost,
      reason: loose
        ? `Loose · nearest exp · ${moneyness} · OI ${pick.contract.oi} · ~$${costPer.toFixed(0)}/ct`
        : `Nearest · OI ${pick.contract.oi} · ~$${costPer.toFixed(0)}/ct`,
    })
  }

  return {
    side,
    budget: OPTION_DT_SIDE_BUDGET,
    spent: Math.round((OPTION_DT_SIDE_BUDGET - remaining) * 100) / 100,
    remaining,
    candidates,
    skipped,
  }
}

export async function buildOptionDtPlan(input: {
  accessToken: string
  accountId?: string | null
  tradeScopesOk: boolean
}): Promise<OptionDtPlanResponse> {
  const ranks = await buildTickerRanks()
  const summaryLong = ranks.boards.find((b) => b.id === 'summary_long')
  const summaryShort = ranks.boards.find((b) => b.id === 'summary_short')
  const todayYmd = todayEtYmd()
  const warnings: string[] = []

  if (!input.tradeScopesOk) {
    warnings.push(
      'TradeStation connection is missing MarketData/Trade scopes. Reconnect TradeStation from this page.'
    )
  }
  if (OPTION_DT_LOOSE_FILTERS) {
    warnings.push(
      'Loose filters ON: no premium band, no OTM-only, no 0–5 DTE cap (nearest expirations). Turn off OPTION_DT_LOOSE_FILTERS when ready for production rules.'
    )
  }

  const longRows = summaryLong?.rows ?? []
  const shortRows = summaryShort?.rows ?? []
  const longAbove = longRows.filter(
    (r) => (r.score ?? Number.NEGATIVE_INFINITY) >= OPTION_DT_SCORE_LINE
  )
  const shortAbove = shortRows.filter(
    (r) => (r.score ?? Number.NEGATIVE_INFINITY) >= OPTION_DT_SCORE_LINE
  )

  const jobs: Array<{ ticker: string; side: OptionDtSide }> = [
    ...longAbove.map((r) => ({ ticker: r.ticker, side: 'long' as const })),
    ...shortAbove.map((r) => ({ ticker: r.ticker, side: 'short' as const })),
  ]

  const longPicks = new Map<string, { contract: ScoredContract; underlyingLast: number; dte: number }>()
  const shortPicks = new Map<string, { contract: ScoredContract; underlyingLast: number; dte: number }>()
  const longSkips = new Map<string, string>()
  const shortSkips = new Map<string, string>()

  const concurrency = 3
  for (let i = 0; i < jobs.length; i += concurrency) {
    const batch = jobs.slice(i, i + concurrency)
    await Promise.all(
      batch.map(async (job) => {
        const result = await pickBestContractForTicker({
          accessToken: input.accessToken,
          ticker: job.ticker,
          side: job.side,
          todayYmd,
        })
        const picks = job.side === 'long' ? longPicks : shortPicks
        const skips = job.side === 'long' ? longSkips : shortSkips
        if (result.ok) {
          picks.set(job.ticker, {
            contract: result.contract,
            underlyingLast: result.underlyingLast,
            dte: result.dte,
          })
        } else {
          skips.set(job.ticker, result.reason)
        }
      })
    )
  }

  const long = allocateSide({
    side: 'long',
    rows: longRows,
    picks: longPicks,
    skips: longSkips,
  })
  const short = allocateSide({
    side: 'short',
    rows: shortRows,
    picks: shortPicks,
    skips: shortSkips,
  })

  const asOf =
    longAbove[0]?.as_of ||
    shortAbove[0]?.as_of ||
    longRows[0]?.as_of ||
    shortRows[0]?.as_of ||
    null

  return {
    generated_at: new Date().toISOString(),
    ranks_as_of: asOf,
    score_line: OPTION_DT_SCORE_LINE,
    side_budget: OPTION_DT_SIDE_BUDGET,
    loose_filters: OPTION_DT_LOOSE_FILTERS,
    long,
    short,
    warnings: warnings.length ? warnings : undefined,
    trade_scopes_ok: input.tradeScopesOk,
    account_id: input.accountId ?? null,
  }
}
