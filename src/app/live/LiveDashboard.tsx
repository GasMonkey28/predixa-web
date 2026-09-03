'use client'

import { useEffect, useRef, useState } from 'react'
import { clsx } from 'clsx'

import MoneyMoveChart from './MoneyMoveChart'

const TICKERS = ['SPY', 'QQQ', 'NVDA', 'TSLA', 'AAPL', 'GOOG', 'META', 'AMZN', 'MSFT', 'AMD', 'AVGO', 'COIN', 'MARA', 'MSTR', 'PLTR', 'HOOD', 'SOFI', 'WULF'] as const
const ROTATE_OPTIONS = [15, 30] as const

export default function LiveDashboard() {
  const [symbol, setSymbol] = useState<(typeof TICKERS)[number]>('SPY')
  const [rotate, setRotate] = useState(false)
  const [rotateSec, setRotateSec] = useState<(typeof ROTATE_OPTIONS)[number]>(30)

  // keep the interval callback pointed at the latest symbol without
  // re-arming the timer every tick
  const symbolRef = useRef(symbol)
  symbolRef.current = symbol
  const moveRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!rotate) return
    const id = setInterval(() => {
      const i = TICKERS.indexOf(symbolRef.current)
      setSymbol(TICKERS[(i + 1) % TICKERS.length])
    }, rotateSec * 1000)
    return () => clearInterval(id)
  }, [rotate, rotateSec])

  // while rotating, snap back to the top of the money-move block on each hop
  useEffect(() => {
    if (rotate) moveRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [symbol, rotate])

  return (
    <div className="space-y-6">
      <div className="space-y-2">
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

        <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <button
            onClick={() => setRotate((v) => !v)}
            className={clsx(
              'rounded px-2.5 py-1 font-medium',
              rotate
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            )}
          >
            {rotate ? '⏸ Auto-rotate on' : '▶ Auto-rotate'}
          </button>
          <span className="uppercase tracking-wide">every</span>
          {ROTATE_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setRotateSec(s)}
              className={clsx(
                'rounded px-1.5 py-0.5 font-medium tabular-nums',
                s === rotateSec
                  ? 'bg-gray-700 text-white dark:bg-gray-600'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              )}
            >
              {s}s
            </button>
          ))}
        </div>
      </div>

      <section ref={moveRef} className="scroll-mt-4 space-y-2">
        <div className="flex items-baseline gap-2">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {symbol} money move
          </h2>
          <span className="text-xs text-gray-400">
            expiring today · next two monthlies · all expirations
          </span>
        </div>
        <MoneyMoveChart symbol={symbol} />
      </section>
    </div>
  )
}
