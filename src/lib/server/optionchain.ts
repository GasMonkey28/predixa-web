import axios from 'axios'

import { config } from '@/lib/server/config'

// Tickers with their own optionchain-1min recorder + money-move Lambdas.
export const OPTIONCHAIN_TICKERS = ['SPY', 'QQQ', 'NVDA', 'TSLA', 'AAPL', 'GOOG', 'META', 'AMZN', 'MSFT', 'AMD', 'AVGO', 'COIN', 'MARA', 'MSTR', 'PLTR', 'HOOD', 'SOFI', 'WULF'] as const
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
  return fetchOptionChainKeys([`charts/optionchain/${symbol}/${file}`, ...(symbol === 'SPY' ? [`charts/optionchain/${file}`] : [])], timeoutMs)
}

/**
 * Fetch a historical (dated) money-move snapshot -- written alongside the
 * live money_move.json by the moneymove Lambda's day param, archived at
 * charts/optionchain/<symbol>/by-date/<date>.json. Only as far back as the
 * moneymove Lambda has been (re)run for -- currently just SPY, backfilled a
 * handful of days (bounded by the 7-day raw parquet retention).
 */
export async function fetchOptionChainDatedJson(symbol: OptionChainTicker, date: string, timeoutMs = 10_000) {
  return fetchOptionChainKeys([`charts/optionchain/${symbol}/by-date/${date}.json`], timeoutMs)
}

async function fetchOptionChainKeys(keys: string[], timeoutMs: number) {
  const bucket = config.marketData.bucket
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
