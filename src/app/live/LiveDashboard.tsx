'use client'

import { useState } from 'react'
import { clsx } from 'clsx'

import OptionChainLive from './OptionChainLive'
import MoneyMoveChart from './MoneyMoveChart'

const TICKERS = ['SPY', 'QQQ', 'NVDA', 'TSLA', 'AAPL', 'GOOG', 'META', 'AMZN', 'MSFT', 'AMD', 'AVGO'] as const

export default function LiveDashboard() {
  const [symbol, setSymbol] = useState<(typeof TICKERS)[number]>('SPY')

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center gap-1.5 text-sm">
        <span className="mr-1 text-xs uppercase tracking-wide text-gray-400">Ticker</span>
        {TICKERS.map((t) => (
          <button
            key={t}
            onClick={() => setSymbol(t)}
            className={clsx(
              'rounded px-2.5 py-1 font-semibold tabular-nums',
              t === symbol
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Today&apos;s money move
        </h2>
        <p className="max-w-3xl text-sm text-gray-600 dark:text-gray-400">
          Where the dollars are going — cumulative traded value for the busiest{' '}
          {symbol} contracts, minute by minute, in parallel columns: contracts{' '}
          <em>expiring today</em>, then the next two <em>third-Friday monthlies</em>,
          then <em>all expirations</em>.
        </p>
        <MoneyMoveChart symbol={symbol} />
      </section>

      <div className="max-w-5xl">
        <OptionChainLive symbol={symbol} />
      </div>
    </div>
  )
}
