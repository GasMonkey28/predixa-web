'use client'

import { useEffect, useState } from 'react'

type HorizonPrediction = {
  horizon_trading_days?: number
  open_price?: number
  pred_high_price?: number
  pred_low_price?: number
  pred_close_price?: number
  training_rows?: number
}

type MoneyFlowPayload = {
  as_of_date?: string
  model_name?: string
  predictions?: Record<string, HorizonPrediction>
  meta?: { feature_set?: string; note?: string }
  timestamp?: string
  status?: string
  error?: string
  hint?: string
}

const HORIZON_ORDER = ['5d', '10d', '15d', '20d']
const HORIZON_LABEL: Record<string, string> = {
  '5d': '5 trading days',
  '10d': '10 trading days',
  '15d': '15 trading days',
  '20d': '20 trading days',
}
const HORIZON_LABEL_SHORT: Record<string, string> = {
  '5d': '5d',
  '10d': '10d',
  '15d': '15d',
  '20d': '20d',
}

function money(n?: number | null) {
  if (n == null || Number.isNaN(Number(n))) return '—'
  return `$${Number(n).toFixed(2)}`
}

export default function LiveForecastTable({
  symbol = 'SPY',
  compact = false,
}: {
  symbol?: string
  compact?: boolean
}) {
  const [data, setData] = useState<MoneyFlowPayload | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setData(null)
    fetch(`/api/moneyflow-horizon?ticker=${encodeURIComponent(symbol)}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setData(d)
      })
      .catch(() => {
        if (!cancelled) setData({ status: 'missing', error: 'network error' })
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [symbol])

  const pad = compact ? 'px-2.5 py-1.5' : 'px-4 py-3'
  const labels = compact ? HORIZON_LABEL_SHORT : HORIZON_LABEL

  if (loading) {
    return (
      <div className={`rounded-xl border border-gray-200 bg-gray-50 ${compact ? 'p-3 text-xs' : 'p-6 text-sm'} text-gray-500 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-400`}>
        Loading latest forecast…
      </div>
    )
  }

  if (!data || data.status === 'missing' || data.status === 'error' || !data.predictions) {
    return (
      <div className={`rounded-xl border border-gray-200 bg-gray-50 ${compact ? 'p-3 text-xs' : 'p-6 text-sm'} text-gray-500 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-400`}>
        No forecast available yet for today. This updates automatically once the
        morning model run completes.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
      <table className={`w-full ${compact ? 'text-xs' : 'text-sm'}`}>
        <thead className="bg-gray-50 dark:bg-gray-900/50">
          <tr className="text-left text-gray-500 dark:text-gray-400">
            <th className={`${pad} font-medium`}>{compact ? 'H' : 'Horizon'}</th>
            {!compact && <th className={`${pad} font-medium`}>Open</th>}
            <th className={`${pad} font-medium`}>{compact ? 'Low' : 'Predicted low'}</th>
            <th className={`${pad} font-medium`}>{compact ? 'Close' : 'Predicted close'}</th>
            <th className={`${pad} font-medium`}>{compact ? 'High' : 'Predicted high'}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {HORIZON_ORDER.filter((h) => data.predictions?.[h]).map((h) => {
            const p = data.predictions![h]
            return (
              <tr key={h} className="text-gray-700 dark:text-gray-300">
                <td className={`${pad} font-medium text-gray-900 dark:text-white`}>
                  {labels[h] ?? h}
                </td>
                {!compact && <td className={`${pad} tabular-nums`}>{money(p.open_price)}</td>}
                <td className={`${pad} tabular-nums`}>{money(p.pred_low_price)}</td>
                <td className={`${pad} tabular-nums font-medium`}>{money(p.pred_close_price)}</td>
                <td className={`${pad} tabular-nums`}>{money(p.pred_high_price)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div className={`border-t border-gray-200 ${pad} text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400`}>
        {compact
          ? `open ${money(data.predictions[HORIZON_ORDER[0]]?.open_price)} · as of ${data.as_of_date ?? '—'}`
          : `As of ${data.as_of_date ?? '—'} · generated ${data.timestamp ? new Date(data.timestamp).toLocaleString() : '—'}`}
      </div>
    </div>
  )
}
