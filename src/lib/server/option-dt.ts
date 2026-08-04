import {
  OPTION_DT_LOOSE_FILTERS,
  OPTION_DT_MAX_DTE_TRADING_DAYS,
  OPTION_DT_PRICE_MAX,
  OPTION_DT_PRICE_MIN,
  OPTION_DT_PRICE_TARGET,
  OPTION_DT_PREMIUM_LABEL,
  OPTION_DT_SCORE_LINE,
  OPTION_DT_SIDE_BUDGET,
  type OptionDtCandidate,
  type OptionDtContractChoice,
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
  dte: number
}

function contractChoiceFromScored(
  c: ScoredContract,
  side: OptionDtSide,
  underlyingLast: number
): OptionDtContractChoice {
  const ask = toNum(c.row.Ask) ?? (c.premium > 0 ? c.premium : undefined)
  const costPer = Math.round(Math.max(ask ?? 0, 0) * 100 * 100) / 100
  const priceBit =
    ask != null && ask > 0 ? `$${costPer.toFixed(0)}/ct` : 'no quote'
  const otm =
    side === 'long' ? c.strike >= underlyingLast : c.strike <= underlyingLast
  const moneyBit = otm ? (Math.abs(c.strike - underlyingLast) < 1e-6 ? 'ATM' : 'OTM') : 'ITM'
  return {
    optionSymbol: c.symbol,
    strike: c.strike,
    expiration: c.expiration,
    dteTradingDays: c.dte,
    bid: toNum(c.row.Bid),
    ask: ask != null && ask > 0 ? ask : undefined,
    mid: toNum(c.row.Mid) ?? (c.premium > 0 ? c.premium : undefined),
    openInterest: c.oi,
    costPerContract: costPer,
    label: `${c.preferredBand ? '★ ' : ''}$${c.strike} · ${moneyBit} · ${c.expiration} · ${priceBit} · ${c.dte}d`,
  }
}

/** Build contract list for a chain snapshot. No OI filter — OI is display-only. */
function scoreContracts(
  rows: TradeStationOptionChainRow[],
  underlyingLast: number,
  loose: boolean,
  dte: number,
  expirationFallback: string
): ScoredContract[] {
  const scored: ScoredContract[] = []

  for (const row of rows) {
    const leg = row.Legs?.[0]
    const symbol = leg?.Symbol || row.Symbol
    const strike = toNum(leg?.StrikePrice ?? row.StrikePrice ?? row.Strikes?.[0])
    const exp =
      expirationYmd(leg?.Expiration || '') ||
      expirationYmd(row.ExpirationDate || '') ||
      expirationFallback ||
      null
    const premium = pickPremium(row)
    const oi = toNum(row.DailyOpenInterest) ?? toNum(row.OpenInterest) ?? 0
    if (!symbol || strike == null || !exp) continue

    // Include all strikes (ITM + OTM), even without a quote. Expensive ITM quotes stay listed.
    const atmDistance = Math.abs(strike - underlyingLast)

    scored.push({
      row,
      symbol,
      strike,
      expiration: exp,
      premium: premium ?? 0,
      oi,
      atmDistance,
      preferredBand:
        premium != null && inBand(premium, OPTION_DT_PRICE_MIN, OPTION_DT_PRICE_MAX),
      dte,
    })
  }

  scored.sort((a, b) => {
    if (a.preferredBand !== b.preferredBand) return a.preferredBand ? -1 : 1
    if (a.atmDistance !== b.atmDistance) return a.atmDistance - b.atmDistance
    if (!loose && a.premium > 0 && b.premium > 0) {
      return Math.abs(a.premium - OPTION_DT_PRICE_TARGET) - Math.abs(b.premium - OPTION_DT_PRICE_TARGET)
    }
    return a.strike - b.strike
  })

  return scored
}

async function pickBestContractForTicker(input: {
  accessToken: string
  ticker: string
  side: OptionDtSide
  todayYmd: string
}): Promise<
  | {
      ok: true
      contract: ScoredContract
      alternatives: ScoredContract[]
      underlyingLast: number
      dte: number
    }
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

  const allRanked: ScoredContract[] = []
  const diagnostics: string[] = []
  const expLimit = loose ? 8 : Math.min(eligible.length, 6)

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
          strikeRange: 'All',
          strikeProximity: 40,
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

    const ranked = scoreContracts(
      detail.rows,
      underlyingLast,
      loose,
      exp.dte,
      exp.ymd || todayYmd
    )
    // Include ITM + OTM/ATM strikes in the picker.
    allRanked.push(...ranked)
  }

  const bySymbol = new Map<string, ScoredContract>()
  for (const c of allRanked) {
    const existing = bySymbol.get(c.symbol)
    if (!existing) {
      bySymbol.set(c.symbol, c)
      continue
    }
    // Prefer a quote when deduping; never use OI as a gate.
    const existingHasQuote = existing.premium > 0
    const nextHasQuote = c.premium > 0
    if (nextHasQuote && !existingHasQuote) {
      bySymbol.set(c.symbol, c)
      continue
    }
    if (c.dte < existing.dte || (c.dte === existing.dte && c.atmDistance < existing.atmDistance)) {
      bySymbol.set(c.symbol, c)
    }
  }

  // Dropdown order: by expiration, then strike (easy to scan). ★ preferred still used for default.
  const alternatives = Array.from(bySymbol.values()).sort((a, b) => {
    if (a.dte !== b.dte) return a.dte - b.dte
    if (a.strike !== b.strike) return a.strike - b.strike
    return a.symbol.localeCompare(b.symbol)
  })

  if (alternatives.length === 0) {
    const hint = diagnostics.slice(0, 3).join(' · ')
    return {
      ok: false,
      reason: `No option contracts from chain (${hint || 'empty'})`,
    }
  }

  const isOtmOrAtm = (c: ScoredContract) =>
    side === 'long' ? c.strike >= underlyingLast : c.strike <= underlyingLast

  // Default pick: prefer OTM/ATM in preferred band, then any preferred, then nearest quote.
  const byPickQuality = (a: ScoredContract, b: ScoredContract) =>
    a.atmDistance - b.atmDistance || a.dte - b.dte
  const preferredOtm = alternatives
    .filter((c) => c.preferredBand && isOtmOrAtm(c))
    .sort(byPickQuality)
  const preferredAny = alternatives.filter((c) => c.preferredBand).sort(byPickQuality)
  const withQuote = alternatives.filter((c) => c.premium > 0).sort(byPickQuality)
  const best = preferredOtm[0] ?? preferredAny[0] ?? withQuote[0] ?? alternatives[0]

  return {
    ok: true,
    contract: best,
    alternatives: alternatives.slice(0, 80),
    underlyingLast,
    dte: best.dte,
  }
}

function allocateSide(input: {
  side: OptionDtSide
  rows: TickerRankRow[]
  picks: Map<
    string,
    {
      contract: ScoredContract
      alternatives: ScoredContract[]
      underlyingLast: number
      dte: number
    }
  >
  skips: Map<string, string>
}): OptionDtSidePlan {
  const { side, rows, picks, skips } = input
  const loose = OPTION_DT_LOOSE_FILTERS
  const optionType = side === 'long' ? 'Call' : 'Put'
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

    // $500 is a suggested initial sizing guide only — never skip a ticker for budget.
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
      if (costPer <= remaining) {
        const maxQty = Math.floor(remaining / costPer)
        quantity = Math.max(1, Math.min(maxQty, 5))
      } else {
        quantity = 1
      }
    }

    const estimatedCost = Math.round(quantity * costPer * 100) / 100
    remaining = Math.round((remaining - estimatedCost) * 100) / 100

    const moneyness =
      side === 'long'
        ? pick.contract.strike >= pick.underlyingLast
          ? 'OTM/ATM call'
          : 'ITM call'
        : pick.contract.strike <= pick.underlyingLast
          ? 'OTM/ATM put'
          : 'ITM put'

    const alternatives = pick.alternatives.map((c) =>
      contractChoiceFromScored(c, side, pick.underlyingLast)
    )

    candidates.push({
      id: `${side}:${row.ticker}`,
      side,
      ticker: row.ticker,
      summaryScore: row.score ?? 0,
      mixScore: row.mix_score,
      hands: row.position_size,
      signal: row.signal,
      underlyingLast: pick.underlyingLast,
      optionSymbol: pick.contract.symbol,
      optionType,
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
        ? `Loose · nearest exp · ${moneyness} · ~$${costPer.toFixed(0)}/ct`
        : `Nearest · ~$${costPer.toFixed(0)}/ct`,
      alternatives,
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

  const longPicks = new Map<
    string,
    {
      contract: ScoredContract
      alternatives: ScoredContract[]
      underlyingLast: number
      dte: number
    }
  >()
  const shortPicks = new Map<
    string,
    {
      contract: ScoredContract
      alternatives: ScoredContract[]
      underlyingLast: number
      dte: number
    }
  >()
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
            alternatives: result.alternatives,
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
