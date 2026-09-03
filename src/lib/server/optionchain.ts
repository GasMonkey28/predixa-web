import axios from 'axios'

import { config } from '@/lib/server/config'

// Tickers with their own optionchain-1min recorder + money-move Lambdas.
export const OPTIONCHAIN_TICKERS = ['SPY', 'QQQ', 'NVDA', 'TSLA', 'AAPL', 'GOOG', 'META', 'AMZN', 'MSFT', 'AMD', 'AVGO'] as const
export type OptionChainTicker = (typeof OPTIONCHAIN_TICKERS)[number]

export function normalizeOptionChainSymbol(raw: string | null | undefined): OptionChainTicker {
  const s = (raw || 'SPY').toUpperCase()
  return (OPTIONCHAIN_TICKERS as readonly string[]).includes(s)
    ? (s as OptionChainTicker)
    : 'SPY'
}

/**
 * Fetch one of the recorder's web-JSON files (latest.json / full.json /
 * money_move.json) for a ticker. SPY also falls back to the legacy
 * non-namespaced key. Objects are gzip on S3; axios inflates them.
 */
export async function fetchOptionChainJson(
  file: 'latest.json' | 'full.json' | 'money_move.json',
  symbol: OptionChainTicker,
  timeoutMs = 10_000
) {
  const bucket = config.marketData.bucket
  const keys = [`charts/optionchain/${symbol}/${file}`]
  if (symbol === 'SPY') keys.push(`charts/optionchain/${file}`) // legacy alias

  let lastErr: unknown = null
  for (const key of keys) {
    for (const url of [
      `https://s3.amazonaws.com/${bucket}/${key}`,
      `https://${bucket}.s3.amazonaws.com/${key}`,
    ]) {
      try {
        const res = await axios.get(url, {
          headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
          timeout: timeoutMs,
          decompress: true,
        })
        return res.data
      } catch (e) {
        lastErr = e
      }
    }
  }
  throw lastErr
}
