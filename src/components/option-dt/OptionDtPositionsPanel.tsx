'use client'

import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

export type OptionDtOpenPosition = {
  positionId: string
  symbol: string
  quantity: number
  longShort: 'Long' | 'Short' | string
  averagePrice: number
  last: number | null
  marketValue: number
  totalCost: number
  unrealizedPnl: number
  todaysPnl: number | null
  assetType?: string | null
}

function money(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  const sign = n < 0 ? '-' : ''
  return `${sign}$${Math.abs(n).toFixed(2)}`
}

function shortLabel(symbol: string): string {
  // "AMD 260805C520" → "AMD C520"
  const m = symbol.match(/^(\S+)\s+\d{6}([CP])([\d.]+)/i)
  if (m) return `${m[1]} ${m[2].toUpperCase()}${m[3]}`
  return symbol.length > 14 ? `${symbol.slice(0, 12)}…` : symbol
}

export default function OptionDtPositionsPanel({
  positions,
  totals,
  loading,
  busySymbol,
  onRefresh,
  onBuyMore,
  onSellOne,
  onFlatten,
}: {
  positions: OptionDtOpenPosition[]
  totals: { marketValue: number; totalCost: number; unrealizedPnl: number; contracts: number }
  loading?: boolean
  busySymbol?: string | null
  onRefresh: () => void
  onBuyMore: (symbol: string) => void
  onSellOne: (symbol: string) => void
  onFlatten: (symbol: string) => void
}) {
  const chartData = useMemo(
    () =>
      positions.map((p) => ({
        key: p.symbol,
        label: shortLabel(p.symbol),
        pnl: Math.round(p.unrealizedPnl * 100) / 100,
        marketValue: Math.round(p.marketValue * 100) / 100,
        qty: p.quantity,
      })),
    [positions]
  )

  return (
    <section className="rounded-2xl border border-zinc-800/60 bg-gradient-to-br from-zinc-900/85 to-zinc-950/90 overflow-hidden">
      <header className="border-b border-zinc-800/80 px-4 py-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-white">Open option positions</h2>
          <p className="text-xs text-zinc-400 mt-1">
            Paper account P&amp;L — buy more or flatten each contract.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-xs text-zinc-400 text-right">
            <div>
              MV {money(totals.marketValue)} · Cost {money(totals.totalCost)}
            </div>
            <div className={totals.unrealizedPnl >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
              uPnL {money(totals.unrealizedPnl)} · {totals.contracts} ct
            </div>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="rounded-lg border border-zinc-600 text-zinc-200 hover:bg-zinc-800 disabled:opacity-50 text-sm font-medium px-3 py-2"
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </header>

      {positions.length === 0 ? (
        <div className="px-4 py-12 text-center text-zinc-500 text-sm">
          {loading ? 'Loading positions…' : 'No open option positions on this paper account.'}
        </div>
      ) : (
        <>
          <div className="px-2 pt-4 pb-2 h-56 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 12, left: 4, bottom: 28 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#a1a1aa', fontSize: 11 }}
                  interval={0}
                  angle={-25}
                  textAnchor="end"
                  height={50}
                />
                <YAxis
                  tick={{ fill: '#a1a1aa', fontSize: 11 }}
                  tickFormatter={(v) => `$${v}`}
                  width={56}
                />
                <Tooltip
                  contentStyle={{
                    background: '#09090b',
                    border: '1px solid #3f3f46',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(value: number, name: string) => [
                    money(value),
                    name === 'pnl' ? 'Unrealized P&L' : name,
                  ]}
                  labelFormatter={(label, payload) => {
                    const full = payload?.[0]?.payload?.key
                    return full || label
                  }}
                />
                <ReferenceLine y={0} stroke="#52525b" />
                <Bar dataKey="pnl" name="pnl" radius={[4, 4, 0, 0]}>
                  {chartData.map((row) => (
                    <Cell
                      key={row.key}
                      fill={row.pnl >= 0 ? '#34d399' : '#fb7185'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="overflow-auto border-t border-zinc-800/80">
            <table className="w-full text-sm">
              <thead className="bg-zinc-950/95 text-[11px] uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-3 py-2 text-left">Contract</th>
                  <th className="px-3 py-2 text-right">Qty</th>
                  <th className="px-3 py-2 text-right">Avg</th>
                  <th className="px-3 py-2 text-right">Last</th>
                  <th className="px-3 py-2 text-right">MV</th>
                  <th className="px-3 py-2 text-right">uPnL</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((p) => {
                  const busy = busySymbol === p.symbol
                  return (
                    <tr key={p.positionId || p.symbol} className="border-t border-zinc-800/50">
                      <td className="px-3 py-2">
                        <div className="font-mono text-xs text-white">{p.symbol}</div>
                        <div className="text-[11px] text-zinc-500">{p.longShort}</div>
                      </td>
                      <td className="px-3 py-2 text-right text-zinc-200">{p.quantity}</td>
                      <td className="px-3 py-2 text-right text-zinc-300">{money(p.averagePrice)}</td>
                      <td className="px-3 py-2 text-right text-zinc-300">{money(p.last)}</td>
                      <td className="px-3 py-2 text-right text-zinc-200">{money(p.marketValue)}</td>
                      <td
                        className={`px-3 py-2 text-right font-medium ${
                          p.unrealizedPnl >= 0 ? 'text-emerald-300' : 'text-rose-300'
                        }`}
                      >
                        {money(p.unrealizedPnl)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="inline-flex gap-1.5">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => onBuyMore(p.symbol)}
                            className="rounded-md bg-emerald-600/90 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-medium px-2 py-1.5"
                          >
                            {busy ? '…' : 'Buy +1'}
                          </button>
                          <button
                            type="button"
                            disabled={busy || p.quantity < 1}
                            onClick={() => onSellOne(p.symbol)}
                            className="rounded-md bg-amber-600/90 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-medium px-2 py-1.5"
                          >
                            {busy ? '…' : 'Sell −1'}
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => onFlatten(p.symbol)}
                            className="rounded-md border border-rose-500/50 text-rose-200 hover:bg-rose-500/10 disabled:opacity-50 text-xs font-medium px-2 py-1.5"
                          >
                            Flat
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  )
}
