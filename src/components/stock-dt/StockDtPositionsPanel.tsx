'use client'

import { useState } from 'react'

import {
  summarizeFlattenUndo,
  type DtFlattenUndoLot,
} from '@/lib/dt-flatten-undo'
import { formatSignedPct } from '@/lib/dt-quotes'
import { groupPositionsByTradingDay } from '@/lib/dt-position-days'

export type StockDtWorkingOrder = {
  orderId: string
  symbol: string
  side: string
  status: string
  quantity: number
  message?: string | null
  filled?: boolean
  working?: boolean
}

export type StockDtOpenPosition = {
  positionId: string
  symbol: string
  quantity: number
  longShort: 'Long' | 'Short' | string
  averagePrice: number
  last: number | null
  previousClose?: number
  netChange?: number
  /** Day net change %, e.g. 1.25 for +1.25%. */
  netChangePct?: number
  marketValue: number
  totalCost: number
  unrealizedPnl: number
  todaysPnl: number | null
  assetType?: string | null
  entryDate?: string | null
  timestamp?: string | null
  /** Model Reclaim flat / band re-entry price when feeder available. */
  targetClose?: number | null
  /** Model Reclaim short stop; null for longs / missing feeder. */
  stopLoss?: number | null
}

function money(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  const sign = n < 0 ? '-' : ''
  return `${sign}$${Math.abs(n).toFixed(2)}`
}

function clampTradeSize(raw: number): number {
  if (!Number.isFinite(raw)) return 1
  return Math.max(1, Math.min(10_000, Math.floor(raw)))
}

function dayTotals(rows: StockDtOpenPosition[]) {
  return rows.reduce(
    (acc, p) => {
      acc.marketValue += p.marketValue
      acc.totalCost += p.totalCost
      acc.unrealizedPnl += p.unrealizedPnl
      acc.shares += p.quantity
      return acc
    },
    { marketValue: 0, totalCost: 0, unrealizedPnl: 0, shares: 0 }
  )
}

export default function StockDtPositionsPanel({
  positions,
  workingOrders,
  totals,
  buyingPower,
  loading,
  busySymbol,
  busyDay,
  undoing,
  flattenUndo,
  onRefresh,
  onBuyMore,
  onSellOne,
  onFlatten,
  onFlattenDay,
  onUndoFlatten,
  onDismissUndo,
}: {
  positions: StockDtOpenPosition[]
  workingOrders?: StockDtWorkingOrder[]
  totals: { marketValue: number; totalCost: number; unrealizedPnl: number; shares: number }
  buyingPower?: number | null
  loading?: boolean
  busySymbol?: string | null
  busyDay?: string | null
  undoing?: boolean
  flattenUndo?: DtFlattenUndoLot[] | null
  onRefresh: () => void
  onBuyMore: (symbol: string, quantity: number) => void
  onSellOne: (symbol: string, quantity: number) => void
  onFlatten: (symbol: string) => void
  onFlattenDay: (day: string, symbols: string[]) => void
  onUndoFlatten: () => void
  onDismissUndo: () => void
}) {
  const [tradeSize, setTradeSize] = useState(1)
  const size = clampTradeSize(tradeSize)
  const dayGroups = groupPositionsByTradingDay(positions)
  const anyBusy = Boolean(busySymbol || busyDay || undoing)
  const undoLots = flattenUndo && flattenUndo.length > 0 ? flattenUndo : null
  const orders = workingOrders ?? []

  return (
    <section className="rounded-2xl border border-zinc-800/60 bg-gradient-to-br from-zinc-900/85 to-zinc-950/90 overflow-hidden">
      <header className="border-b border-zinc-800/80 px-4 py-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-white">Open stock positions</h2>
          <p className="text-xs text-zinc-400 mt-1">
            Paper account P&amp;L by entry day — add/trim by size, or flatten each name.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-zinc-400">
            <span>Size</span>
            <input
              type="number"
              min={1}
              max={10000}
              value={tradeSize}
              onChange={(e) => setTradeSize(clampTradeSize(Number(e.target.value)))}
              className="w-16 rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-right text-sm text-zinc-100"
            />
          </label>
          <div className="text-xs text-zinc-400 text-right">
            <div>
              MV {money(totals.marketValue)} · Cost {money(totals.totalCost)}
            </div>
            <div className={totals.unrealizedPnl >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
              uPnL {money(totals.unrealizedPnl)} · {totals.shares} sh
            </div>
            {buyingPower != null && Number.isFinite(buyingPower) && (
              <div className={buyingPower <= 0 ? 'text-rose-300' : 'text-zinc-400'}>
                BP {money(buyingPower)}
              </div>
            )}
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

      {orders.length > 0 && (
        <div className="border-b border-sky-500/25 bg-sky-500/5 px-4 py-3 space-y-2">
          <p className="text-xs font-semibold text-sky-200">
            Working / recent orders — not a position until status is FLL (filled)
          </p>
          {orders.some((o) => o.status.toUpperCase() === 'REJ') && (
            <p className="text-[11px] text-rose-200/90">
              REJ is TradeStation rejecting the ticket (often buying power / margin). Existing
              rows below are older fills — rejected names never opened.
            </p>
          )}
          <ul className="space-y-1">
            {orders.map((o) => (
              <li key={o.orderId} className="text-xs text-zinc-300 font-mono">
                <span className="text-white">{o.symbol || '—'}</span>{' '}
                <span className="text-zinc-500">{o.side}</span>{' '}
                {o.quantity > 0 ? `${o.quantity} sh · ` : ''}
                <span
                  className={
                    o.status.toUpperCase() === 'REJ'
                      ? 'text-rose-300'
                      : o.working
                        ? 'text-amber-300'
                        : 'text-emerald-300'
                  }
                >
                  {o.status || '—'}
                </span>
                {o.message ? <span className="text-zinc-500"> · {o.message}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      )}

      {undoLots && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2.5">
          <p className="text-sm text-amber-100">
            Flattened {summarizeFlattenUndo(undoLots)} — undo to buy back / re-short at market.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={anyBusy}
              onClick={onUndoFlatten}
              className="rounded-md bg-amber-500/90 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 text-xs font-semibold px-3 py-1.5"
            >
              {undoing ? 'Undoing…' : 'Undo flat'}
            </button>
            <button
              type="button"
              disabled={undoing}
              onClick={onDismissUndo}
              className="rounded-md border border-zinc-600 text-zinc-300 hover:bg-zinc-800 disabled:opacity-50 text-xs font-medium px-2.5 py-1.5"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {positions.length === 0 ? (
        <div className="px-4 py-12 text-center text-zinc-500 text-sm">
          {loading
            ? 'Loading positions…'
            : undoLots
              ? 'Positions flattened — use Undo flat to buy them back at market.'
              : 'No open stock positions on this paper account.'}
        </div>
      ) : (
        <div className="divide-y divide-zinc-800/80">
          {dayGroups.map((group) => {
            const day = dayTotals(group.positions)
            const dayBusy = busyDay === group.day
            const pnlPositive = day.unrealizedPnl >= 0
            return (
              <div key={group.day}>
                <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-950/70 px-4 py-3 border-b border-zinc-800/60">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-zinc-100">{group.label}</h3>
                    <div className="mt-0.5 text-[11px] text-zinc-500">
                      MV {money(day.marketValue)} · Cost {money(day.totalCost)} · {day.shares} sh ·{' '}
                      {group.positions.length} pos
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <div
                      className={`rounded-lg px-3 py-1.5 text-right tabular-nums ${
                        pnlPositive
                          ? 'bg-emerald-500/15 ring-1 ring-emerald-500/35'
                          : 'bg-rose-500/15 ring-1 ring-rose-500/35'
                      }`}
                    >
                      <div className="text-[10px] uppercase tracking-wide text-zinc-400">Day uPnL</div>
                      <div
                        className={`text-base font-semibold leading-tight ${
                          pnlPositive ? 'text-emerald-300' : 'text-rose-300'
                        }`}
                      >
                        {money(day.unrealizedPnl)}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={anyBusy}
                      onClick={() =>
                        onFlattenDay(
                          group.day,
                          group.positions.map((p) => p.symbol)
                        )
                      }
                      className="rounded-md border border-rose-500/50 text-rose-200 hover:bg-rose-500/10 disabled:opacity-50 text-xs font-medium px-3 py-2"
                    >
                      {dayBusy ? 'Flattening…' : 'Flat day'}
                    </button>
                  </div>
                </div>
                <div className="overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-zinc-950/95 text-[11px] uppercase tracking-wide text-zinc-500">
                      <tr>
                        <th className="px-3 py-2 text-left">Ticker</th>
                        <th className="px-3 py-2 text-right">Qty</th>
                        <th className="px-3 py-2 text-right">Avg</th>
                        <th className="px-3 py-2 text-right">Last</th>
                        <th className="px-3 py-2 text-right whitespace-nowrap">Chg %</th>
                        <th className="px-3 py-2 text-right whitespace-nowrap">Target</th>
                        <th className="px-3 py-2 text-right whitespace-nowrap">Stop</th>
                        <th className="px-3 py-2 text-right">MV</th>
                        <th className="px-3 py-2 text-right">uPnL</th>
                        <th className="px-3 py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.positions.map((p) => {
                        const busy = busySymbol === p.symbol || dayBusy
                        const trimQty = Math.min(size, p.quantity)
                        const chgPct = p.netChangePct
                        const chgPositive = (chgPct ?? p.netChange ?? 0) >= 0
                        return (
                          <tr key={p.positionId || p.symbol} className="border-t border-zinc-800/50">
                            <td className="px-3 py-2">
                              <div className="font-mono text-xs text-white">{p.symbol}</div>
                              <div className="text-[11px] text-zinc-500">{p.longShort}</div>
                            </td>
                            <td className="px-3 py-2 text-right text-zinc-200">{p.quantity}</td>
                            <td className="px-3 py-2 text-right text-zinc-300">{money(p.averagePrice)}</td>
                            <td className="px-3 py-2 text-right text-zinc-300">{money(p.last)}</td>
                            <td
                              className={`px-3 py-2 text-right tabular-nums font-medium ${
                                chgPct == null || !Number.isFinite(chgPct)
                                  ? 'text-zinc-500'
                                  : chgPositive
                                    ? 'text-emerald-400'
                                    : 'text-rose-400'
                              }`}
                            >
                              {chgPct == null || !Number.isFinite(chgPct)
                                ? '—'
                                : formatSignedPct(chgPct)}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums text-amber-200">
                              {money(p.targetClose)}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums text-rose-200">
                              {money(p.stopLoss)}
                            </td>
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
                                  disabled={busy || anyBusy}
                                  onClick={() => onBuyMore(p.symbol, size)}
                                  className="rounded-md bg-emerald-600/90 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-medium px-2 py-1.5"
                                >
                                  {busy
                                    ? '…'
                                    : p.longShort === 'Short'
                                      ? `Short +${size}`
                                      : `Buy +${size}`}
                                </button>
                                <button
                                  type="button"
                                  disabled={busy || anyBusy || p.quantity < 1}
                                  onClick={() => onSellOne(p.symbol, trimQty)}
                                  className="rounded-md bg-amber-600/90 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-medium px-2 py-1.5"
                                >
                                  {busy
                                    ? '…'
                                    : p.longShort === 'Short'
                                      ? `Cover −${trimQty}`
                                      : `Sell −${trimQty}`}
                                </button>
                                <button
                                  type="button"
                                  disabled={busy || anyBusy}
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
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
