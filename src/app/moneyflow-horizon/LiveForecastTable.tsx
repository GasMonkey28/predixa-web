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

function money(n?: number | null) {
  if (n == null || Number.isNaN(Number(n))) return '—'
  return `$${Number(n).toFixed(2)}`
}

export default function LiveForecastTable() {
  const [data, setData] = useState<MoneyFlowPayload | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch('/api/moneyflow-horizon')
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
  }, [])

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-400">
        Loading latest forecast…
      </div>
    )
  }

  if (!data || data.status === 'missing' || !data.predictions) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-400">
        No forecast available yet for today. This page updates automatically once the
        morning model run completes.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-900/50">
          <tr className="text-left text-gray-500 dark:text-gray-400">
            <th className="px-4 py-3 font-medium">Horizon</th>
            <th className="px-4 py-3 font-medium">Open</th>
            <th className="px-4 py-3 font-medium">Predicted low</th>
            <th className="px-4 py-3 font-medium">Predicted close</th>
            <th className="px-4 py-3 font-medium">Predicted high</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {HORIZON_ORDER.filter((h) => data.predictions?.[h]).map((h) => {
            const p = data.predictions![h]
            return (
              <tr key={h} className="text-gray-700 dark:text-gray-300">
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                  {HORIZON_LABEL[h] ?? h}
                </td>
                <td className="px-4 py-3 tabular-nums">{money(p.open_price)}</td>
                <td className="px-4 py-3 tabular-nums">{money(p.pred_low_price)}</td>
                <td className="px-4 py-3 tabular-nums font-medium">{money(p.pred_close_price)}</td>
                <td className="px-4 py-3 tabular-nums">{money(p.pred_high_price)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div className="border-t border-gray-200 px-4 py-3 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
        As of {data.as_of_date ?? '—'} · generated {data.timestamp ? new Date(data.timestamp).toLocaleString() : '—'}
      </div>
    </div>
  )
}
