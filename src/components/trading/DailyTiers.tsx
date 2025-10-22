'use client'

import { useState, useEffect } from 'react'

interface DailyTierData {
  date: string
  long_tier: string
  short_tier: string
  long_score: number
  short_score: number
  summary: string
  suggestions: string[]
  confidence: string
  risk: string
  outlook: string
  disclaimer: string
}

interface DailyTiersProps {
  ticker?: string
}

export default function DailyTiers({ ticker = 'SPY' }: DailyTiersProps) {
  const [tiersData, setTiersData] = useState<DailyTierData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchTiers() {
      try {
        // Add cache busting parameter to force fresh data
        const response = await fetch(`/api/tiers/daily?t=${Date.now()}`)
        const data = await response.json()
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch tier data')
        }
        
        setTiersData(data)
      } catch (err) {
        console.error('Error fetching daily tiers:', err)
        setError('Failed to load tier data')
      } finally {
        setLoading(false)
      }
    }

    fetchTiers()
  }, [ticker])

  if (loading) {
    return (
      <div className="bg-white rounded-lg border p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !tiersData) {
    return (
      <div className="bg-white rounded-lg border p-4">
        <div className="text-center text-red-600">{error || 'No tier data available'}</div>
      </div>
    )
  }

  const getTierColor = (tier: string) => {
    switch (tier.charAt(0)) {
      case 'S': return 'text-purple-600 bg-purple-100'
      case 'A': return tier.includes('+') ? 'text-blue-600 bg-blue-100' : 'text-blue-500 bg-blue-50'
      case 'B': return tier.includes('+') ? 'text-green-600 bg-green-100' : 'text-green-500 bg-green-50'
      case 'C': return tier.includes('+') ? 'text-yellow-600 bg-yellow-100' : 'text-yellow-500 bg-yellow-50'
      case 'D': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getTierDescription = (tier: string) => {
    switch (tier.charAt(0)) {
      case 'S': return 'Elite'
      case 'A': return tier.includes('+') ? 'Excellent' : 'Very Good'
      case 'B': return tier.includes('+') ? 'Good' : 'Above Average'
      case 'C': return tier.includes('+') ? 'Average' : 'Below Average'
      case 'D': return 'Weak'
      default: return 'Unknown'
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Daily Signal</h2>
        <span className="text-sm text-gray-600">{tiersData.date}</span>
      </div>

      {/* Tier Cards */}
      <div className="grid grid-cols-2 gap-4">
        {/* Long Tier */}
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-green-800">Long</span>
            <div className={`px-2 py-1 rounded text-xs font-bold ${getTierColor(tiersData.long_tier)}`}>
              {tiersData.long_tier}
            </div>
          </div>
          <div className="text-xs text-green-600">
            {getTierDescription(tiersData.long_tier)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Score: {tiersData.long_score.toFixed(1)}
          </div>
        </div>

        {/* Short Tier */}
        <div className="bg-red-50 rounded-lg p-4 border border-red-200">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-red-800">Short</span>
            <div className={`px-2 py-1 rounded text-xs font-bold ${getTierColor(tiersData.short_tier)}`}>
              {tiersData.short_tier}
            </div>
          </div>
          <div className="text-xs text-red-600">
            {getTierDescription(tiersData.short_tier)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Score: {tiersData.short_score.toFixed(1)}
          </div>
        </div>
      </div>

      {/* Summary */}
      {tiersData.summary && (
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <h3 className="text-sm font-semibold text-blue-800 mb-2">Summary</h3>
          <p className="text-sm text-blue-700">{tiersData.summary}</p>
        </div>
      )}

      {/* Suggestions */}
      {tiersData.suggestions && tiersData.suggestions.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-800 mb-2">Suggestions</h3>
          <ul className="space-y-1">
            {tiersData.suggestions.map((suggestion, index) => (
              <li key={index} className="text-sm text-gray-700 flex items-start">
                <span className="text-gray-400 mr-2">•</span>
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Risk & Confidence */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
          <div className="text-xs font-semibold text-yellow-800">Confidence</div>
          <div className="text-sm text-yellow-700">{tiersData.confidence}</div>
        </div>
        <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
          <div className="text-xs font-semibold text-orange-800">Risk Level</div>
          <div className="text-sm text-orange-700">{tiersData.risk}</div>
        </div>
      </div>

      {/* Disclaimer */}
      {tiersData.disclaimer && (
        <div className="bg-gray-100 rounded-lg p-3 border border-gray-300">
          <p className="text-xs text-gray-600 italic">{tiersData.disclaimer}</p>
        </div>
      )}
    </div>
  )
}
