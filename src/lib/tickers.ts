/** Equity tickers with Predixa ML pipelines (expand as more go live). */
export const EQUITY_TICKERS = ['AAPL', 'AMZN'] as const

export type EquityTicker = (typeof EQUITY_TICKERS)[number]

export const DEFAULT_EQUITY_TICKER: EquityTicker = 'AAPL'

/**
 * Website feeder JSON lives on the public market-data bucket (NEXT_PUBLIC_S3_BUCKET / tradespark).
 * Equity pipelines write DBs to predixa; public summary_json + model_y2y3 chart keys are mirrored
 * (or dual-written) onto tradespark for anonymous GetObject like SPY.
 */
export function normalizeTicker(raw?: string | null): string {
  const t = (raw || 'SPY').trim().toUpperCase()
  return t || 'SPY'
}

export function isEquityTicker(ticker: string): boolean {
  return (EQUITY_TICKERS as readonly string[]).includes(ticker)
}

export function isSupportedTicker(ticker: string): boolean {
  return ticker === 'SPY' || isEquityTicker(ticker)
}

/** S3 bucket for public feeder JSON — always the website market-data bucket. */
export function tickerBucket(_ticker: string, spyBucket: string): string {
  return spyBucket
}

/** 3mix letter-tier narrative JSON key. */
export function summaryJsonKey(ticker: string, date: string): string {
  if (ticker === 'SPY') return `summary_json/${date}.json`
  return `summary_json/${ticker}/${date}.json`
}

/** Product Model2 / y2y3 chart JSON key. */
export function model2ChartKey(ticker: string): string {
  if (ticker === 'SPY') return 'model2_y2y3/chart/latest.json'
  return `model_y2y3/${ticker}/chart/latest.json`
}
