'use client'

import { useEffect, useRef, useState } from 'react'
import { clsx } from 'clsx'

import MoneyMoveChart, { MONEYMOVE_HISTORY_TICKERS } from './MoneyMoveChart'
import OptionChainLive from './OptionChainLive'
import TickerStats from './TickerStats'
import HorizonLinesChart from '../moneyflow-horizon/HorizonLinesChart'

const TICKERS = ['SPY', 'QQQ', 'NVDA', 'TSLA', 'AAPL', 'GOOG', 'META', 'AMZN', 'MSFT', 'AMD', 'AVGO', 'COIN', 'MARA', 'MSTR', 'PLTR', 'HOOD', 'SOFI', 'WULF'] as const
const ROTATE_OPTIONS = [15, 30] as const
const LAYOUT_STORAGE_KEY = 'predixa.live.layout.v1'
const DEFAULT_PANEL_WIDTH = 28
const DEFAULT_MFH_HEIGHT = 340
// Money-Flow Horizon Lambda now runs for the full 47-ticker y2y3 universe
// (SPY + these 46). Every ticker in TICKERS above is covered.
const MFH_TICKERS: string[] = [
  'SPY', 'QQQ', 'NVDA', 'TSLA', 'AAPL', 'AMZN', 'AMD', 'AVGO', 'BA', 'BABA', 'BAC',
  'BITO', 'COIN', 'DIS', 'EFA', 'F', 'FXI', 'GLD', 'GOOG', 'HOOD', 'HYG', 'IBIT',
  'INTC', 'IWM', 'JD', 'JPM', 'MARA', 'META', 'MRNA', 'MSFT', 'MSTR', 'MU', 'NFLX',
  'ORCL', 'PLTR', 'SHOP', 'SLV', 'SMCI', 'SOFI', 'SOXL', 'SOXS', 'TLT', 'TQQQ',
  'TSLL', 'UBER', 'WMT', 'WULF', 'XOM',
]

export default function LiveDashboard() {
  const [symbol, setSymbol] = useState<(typeof TICKERS)[number]>('SPY')
  const [rotate, setRotate] = useState(false)
  const [rotateSec, setRotateSec] = useState<(typeof ROTATE_OPTIONS)[number]>(30)
  const [showChain, setShowChain] = useState(false)
  const [panelWidth, setPanelWidth] = useState(DEFAULT_PANEL_WIDTH)
  const [mfhHeight, setMfhHeight] = useState(DEFAULT_MFH_HEIGHT)
  const [layoutLoaded, setLayoutLoaded] = useState(false)

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LAYOUT_STORAGE_KEY) || '{}')
      if (typeof saved.panelWidth === 'number' && Number.isFinite(saved.panelWidth)) {
        setPanelWidth(Math.min(44, Math.max(22, saved.panelWidth)))
      }
      if (typeof saved.mfhHeight === 'number' && Number.isFinite(saved.mfhHeight)) {
        setMfhHeight(Math.min(560, Math.max(260, saved.mfhHeight)))
      }
    } catch { /* Use the compact defaults when storage is unavailable. */ }
    setLayoutLoaded(true)
  }, [])

  useEffect(() => {
    if (!layoutLoaded) return
    try {
      localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify({ panelWidth, mfhHeight }))
    } catch { /* Resizing still works without persistent storage. */ }
  }, [panelWidth, mfhHeight, layoutLoaded])
  // Frozen historical snapshot instead of the live feed. Tiers has full
  // history for every ticker; y2y3 only the model's own rolling ~40 trading
  // days; money-move only as far back as the moneymove Lambda's dated
  // archive goes -- currently just SPY, backfilled a handful of days
  // (bounded by 7-day raw parquet retention). Not reset on ticker switch so
  // you can browse the same date across tickers.
  const [historyDate, setHistoryDate] = useState<string | null>(null)
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })

  const hasMFH = MFH_TICKERS.includes(symbol)

  // keep the interval callback pointed at the latest symbol without
  // re-arming the timer every tick
  const symbolRef = useRef(symbol)
  symbolRef.current = symbol

  useEffect(() => {
    if (!rotate) return
    const id = setInterval(() => {
      const i = TICKERS.indexOf(symbolRef.current)
      setSymbol(TICKERS[(i + 1) % TICKERS.length])
    }, rotateSec * 1000)
    return () => clearInterval(id)
  }, [rotate, rotateSec])

  return (
    <div className="min-w-0 space-y-4">
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
          <button
            onClick={() => setShowChain((v) => !v)}
            className={clsx(
              'ml-2 rounded px-2.5 py-1 font-medium',
              showChain
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            )}
          >
            {showChain ? 'Hide option chain' : 'Show option chain'}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <span className="uppercase tracking-wide">History</span>
          <input
            type="date"
            value={historyDate ?? ''}
            max={todayStr}
            onChange={(e) => setHistoryDate(e.target.value || null)}
            className="rounded border border-gray-300 bg-white px-1.5 py-0.5 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          />
          {historyDate && (
            <button
              onClick={() => setHistoryDate(null)}
              className="rounded bg-gray-100 px-2 py-0.5 font-medium hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
            >
              Back to live
            </button>
          )}
          {historyDate && (
            <span className="text-amber-500">
              viewing {historyDate} · tiers &amp; y2y3 work for any ticker
              {!MONEYMOVE_HISTORY_TICKERS.includes(symbol) &&
                ' · money-move history not backfilled for this ticker yet'}
            </span>
          )}
        </div>
      </div>

      <section className="scroll-mt-4 space-y-2">
        <div className="flex flex-wrap items-baseline gap-2">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {symbol} money move{historyDate ? ` — ${historyDate}` : ''}
          </h2>
          <span className="text-xs text-gray-400">
            {historyDate ? 'frozen historical snapshot' : 'expiring today · next two monthlies · all expirations'}
          </span>
        </div>
        {hasMFH && (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:border-gray-800 dark:bg-gray-900/50 dark:text-gray-300">
            <span className="font-medium">Chart layout</span>
            <label className="hidden items-center gap-2 xl:flex">
              MFH panel width
              <input
                type="range" min="22" max="44" step="1" value={panelWidth}
                onChange={(event) => setPanelWidth(Number(event.target.value))}
                className="w-24 accent-blue-500" aria-label="Money Flow Horizon panel width"
                aria-valuetext={`${panelWidth}% of the dashboard`}
              />
              <span className="w-8 tabular-nums">{panelWidth}%</span>
            </label>
            <label className="flex items-center gap-2">
              MFH height
              <input
                type="range" min="260" max="560" step="20" value={mfhHeight}
                onChange={(event) => setMfhHeight(Number(event.target.value))}
                className="w-24 accent-blue-500" aria-label="Money Flow Horizon chart height"
                aria-valuetext={`${mfhHeight} pixels`}
              />
              <span className="w-12 tabular-nums">{mfhHeight}px</span>
            </label>
            <button
              type="button"
              onClick={() => { setPanelWidth(DEFAULT_PANEL_WIDTH); setMfhHeight(DEFAULT_MFH_HEIGHT) }}
              className="rounded border border-gray-300 px-2 py-1 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              Reset layout
            </button>
          </div>
        )}
        <MoneyMoveChart
          symbol={symbol}
          date={historyDate}
          rightPanelWidthPercent={panelWidth}
          rightPanel={
            <div className="min-w-0 space-y-3">
              <TickerStats symbol={symbol} showOhlc={!hasMFH && !historyDate} date={historyDate} />
              {hasMFH && (
                <div className="space-y-2">
                  <div className="text-xs uppercase tracking-wide text-gray-400">
                    money-flow horizon · 5 / 10 / 15 / 20-day range
                    {historyDate && ' · always current, not affected by History'}
                  </div>
                  <HorizonLinesChart symbol={symbol} height={mfhHeight} barWidth={5.5} compact />
                </div>
              )}
            </div>
          }
        />
      </section>

      {showChain && (
        <div className="max-w-5xl border-t border-gray-200 pt-6 dark:border-gray-800">
          <OptionChainLive symbol={symbol} />
        </div>
      )}
    </div>
  )
}
