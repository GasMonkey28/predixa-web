/** Shared DT equity quote / day-move helpers (Stock DT + Option DT). */

export type DtQuoteSide = 'long' | 'short'

export interface DtTickerQuote {
  ticker: string
  side: DtQuoteSide
  score: number
  last?: number
  previousClose?: number
  netChange?: number
  /** Percent, e.g. 1.25 for +1.25%. */
  netChangePct?: number
}

export interface DtMarketQuotes {
  long: DtTickerQuote[]
  short: DtTickerQuote[]
}

export function toQuoteNum(value: string | number | undefined | null): number | undefined {
  if (value == null || value === '') return undefined
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : undefined
}

/** Derive last / previous close / day change from a TradeStation-style quote. */
export function dayMoveFromQuote(quote: {
  Last?: string | number
  Close?: string | number
  PreviousClose?: string | number
  NetChange?: string | number
  NetChangePct?: string | number
} | null | undefined): {
  last?: number
  previousClose?: number
  netChange?: number
  netChangePct?: number
} {
  if (!quote) return {}
  const last =
    toQuoteNum(quote.Last) ?? toQuoteNum(quote.Close) ?? toQuoteNum(quote.PreviousClose)
  const previousClose = toQuoteNum(quote.PreviousClose) ?? toQuoteNum(quote.Close)
  let netChange = toQuoteNum(quote.NetChange)
  let netChangePct = toQuoteNum(quote.NetChangePct)
  if (
    netChange == null &&
    last != null &&
    previousClose != null &&
    previousClose !== 0
  ) {
    netChange = last - previousClose
  }
  if (
    netChangePct == null &&
    netChange != null &&
    previousClose != null &&
    previousClose !== 0
  ) {
    netChangePct = (netChange / previousClose) * 100
  }
  return {
    last: last != null && last > 0 ? last : undefined,
    previousClose: previousClose != null && previousClose > 0 ? previousClose : undefined,
    netChange,
    netChangePct,
  }
}

export function formatMoney(n: number | undefined | null): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return `$${n.toFixed(2)}`
}

export function formatSignedMoney(n: number | undefined | null): string {
  if (n == null || !Number.isFinite(n)) return '—'
  const sign = n > 0 ? '+' : n < 0 ? '-' : ''
  return `${sign}$${Math.abs(n).toFixed(2)}`
}

export function formatSignedPct(n: number | undefined | null): string {
  if (n == null || !Number.isFinite(n)) return '—'
  const sign = n > 0 ? '+' : ''
  return `${sign}${n.toFixed(2)}%`
}
