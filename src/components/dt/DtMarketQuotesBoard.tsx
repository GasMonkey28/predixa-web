'use client'

import {
  formatMoney,
  formatSignedMoney,
  formatSignedPct,
  type DtMarketQuotes,
  type DtTickerQuote,
} from '@/lib/dt-quotes'

function ChangeCell({
  netChange,
  netChangePct,
}: {
  netChange?: number
  netChangePct?: number
}) {
  if (netChange == null && netChangePct == null) {
    return <span className="text-zinc-500">—</span>
  }
  const positive = (netChange ?? netChangePct ?? 0) >= 0
  return (
    <span className={positive ? 'text-emerald-400' : 'text-rose-400'}>
      {formatSignedMoney(netChange)}{' '}
      <span className="text-[11px] opacity-90">({formatSignedPct(netChangePct)})</span>
    </span>
  )
}

function SideQuotes({ title, rows }: { title: string; rows: DtTickerQuote[] }) {
  return (
    <div className="rounded-xl border border-zinc-800/70 bg-zinc-950/50 overflow-hidden">
      <div className="border-b border-zinc-800/80 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
        {title}
        <span className="ml-2 font-normal normal-case text-zinc-500">{rows.length} names</span>
      </div>
      {rows.length === 0 ? (
        <div className="px-3 py-6 text-center text-xs text-zinc-500">No tickers above the line.</div>
      ) : (
        <div className="overflow-auto max-h-64">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-zinc-950/95 text-[11px] uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-3 py-1.5 text-left">Ticker</th>
                <th className="px-3 py-1.5 text-right">Score</th>
                <th className="px-3 py-1.5 text-right">Last</th>
                <th className="px-3 py-1.5 text-right">Change</th>
                <th className="px-3 py-1.5 text-right whitespace-nowrap">vs Open</th>
                <th className="px-3 py-1.5 text-right whitespace-nowrap">vs Open %</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.side}-${row.ticker}`} className="border-t border-zinc-800/40">
                  <td className="px-3 py-1.5 font-mono text-white">{row.ticker}</td>
                  <td className="px-3 py-1.5 text-right text-zinc-300 tabular-nums">
                    {row.score.toFixed(1)}
                  </td>
                  <td className="px-3 py-1.5 text-right text-zinc-200 tabular-nums">
                    {formatMoney(row.last)}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    <ChangeCell netChange={row.netChange} netChangePct={row.netChangePct} />
                  </td>
                  <td
                    className={`px-3 py-1.5 text-right tabular-nums ${
                      row.fromOpen == null || !Number.isFinite(row.fromOpen)
                        ? 'text-zinc-500'
                        : row.fromOpen >= 0
                          ? 'text-emerald-400'
                          : 'text-rose-400'
                    }`}
                  >
                    {formatSignedMoney(row.fromOpen)}
                  </td>
                  <td
                    className={`px-3 py-1.5 text-right tabular-nums ${
                      row.fromOpenPct == null || !Number.isFinite(row.fromOpenPct)
                        ? 'text-zinc-500'
                        : row.fromOpenPct >= 0
                          ? 'text-emerald-400'
                          : 'text-rose-400'
                    }`}
                  >
                    {formatSignedPct(row.fromOpenPct)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default function DtMarketQuotesBoard({
  market,
  scoreLine,
  filterLabel,
}: {
  market?: DtMarketQuotes | null
  scoreLine: number
  /** Override the default “Summary ranks ≥ N” subtitle. */
  filterLabel?: string
}) {
  if (!market) return null

  return (
    <section className="rounded-2xl border border-zinc-800/60 bg-gradient-to-br from-zinc-900/85 to-zinc-950/90 px-4 py-4 space-y-3">
      <div>
        <h2 className="text-base font-semibold text-white">Today · long / short tape</h2>
        <p className="text-xs text-zinc-400 mt-1">
          {filterLabel || `Summary ranks ≥ ${scoreLine}`} with TradeStation last, day change, and vs
          open.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <SideQuotes title="Long" rows={market.long} />
        <SideQuotes title="Short" rows={market.short} />
      </div>
    </section>
  )
}

/** Compact last + change under a ticker cell. */
export function DtTickerPriceHint({
  last,
  netChange,
  netChangePct,
}: {
  last?: number
  netChange?: number
  netChangePct?: number
}) {
  if (last == null && netChange == null) return null
  const positive = (netChange ?? netChangePct ?? 0) >= 0
  return (
    <div className="text-[11px] tabular-nums mt-0.5">
      <span className="text-zinc-400">{formatMoney(last)}</span>
      {(netChange != null || netChangePct != null) && (
        <span className={`ml-1.5 ${positive ? 'text-emerald-400' : 'text-rose-400'}`}>
          {formatSignedMoney(netChange)} ({formatSignedPct(netChangePct)})
        </span>
      )}
    </div>
  )
}
