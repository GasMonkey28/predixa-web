'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'motion/react'
import {
  RiskCalculatorInputs,
  Scenario,
  ScenarioCalculation,
  LongShortResults,
  RiskCalculatorState,
} from '@/lib/risk-calculator-types'

const STORAGE_KEY = 'risk-calculator-settings'

// Default values from Excel
const DEFAULT_INPUTS: RiskCalculatorInputs = {
  initialBalance: 200000,
  overnightMargin: 2000,
  buySpyGridSpace: 5,
  spyMarketPrice: 680,
  spyToMesPointsRatio: 10,
  eachPointsMesContract: 5,
  safeThreshold: 0.4,
  position: 0,
}

const DEFAULT_LONG_SCENARIOS: Scenario[] = [
  { id: '1', priceLevel: 670, description: 'Scenario 1', probability: 0.35 },
  { id: '2', priceLevel: 652, description: 'Scenario 2', probability: 0.2 },
  { id: '3', priceLevel: 640, description: 'Scenario 3', probability: 0.15 },
  { id: '4', priceLevel: 622, description: 'Scenario 4', probability: 0.15 },
  { id: '5', priceLevel: 500, description: 'Scenario 5', probability: 0.075 },
  { id: '6', priceLevel: 433, description: 'Scenario 6', probability: 0.045 },
  { id: '7', priceLevel: 340, description: 'Scenario 7', probability: 0.03 },
]

const DEFAULT_SHORT_SCENARIOS: Scenario[] = [
  { id: '1', priceLevel: 820, description: 'Scenario 7', probability: 0.1 },
  { id: '2', priceLevel: 800, description: 'Scenario 6', probability: 0.1 },
  { id: '3', priceLevel: 780, description: 'Scenario 5', probability: 0.1 },
  { id: '4', priceLevel: 760, description: 'Scenario 4', probability: 0.1 },
  { id: '5', priceLevel: 740, description: 'Scenario 3', probability: 0.2 },
  { id: '6', priceLevel: 720, description: 'Scenario 2', probability: 0.2 },
  { id: '7', priceLevel: 700, description: 'Scenario 1', probability: 0.2 },
]

// Helper functions for calculations
const roundUp = (value: number): number => Math.ceil(value)
const roundDown = (value: number): number => Math.floor(value)

function calculateAssumePosition(
  marketPrice: number,
  priceLevel: number,
  gridSpace: number,
  isLong: boolean
): number {
  if (isLong) {
    return roundUp((marketPrice - priceLevel) / gridSpace)
  } else {
    return roundUp((priceLevel - marketPrice) / gridSpace)
  }
}

function calculateMaxHands(
  lossPerContract: number,
  initialBalance: number,
  overnightMargin: number
): number {
  // Max hands = ROUNDDOWN(initial balance / (overnight margin - loss/contract))
  // Since loss/contract is negative, this becomes: initial balance / (overnight margin - negative value)
  // Which is: initial balance / (overnight margin + abs(loss))
  const denominator = overnightMargin - lossPerContract
  if (denominator <= 0) return 0
  return roundDown(initialBalance / denominator)
}

function calculateScenario(
  scenario: Scenario,
  inputs: RiskCalculatorInputs,
  isLong: boolean
): ScenarioCalculation {
  const assumePosition = calculateAssumePosition(
    inputs.spyMarketPrice,
    scenario.priceLevel,
    inputs.buySpyGridSpace,
    isLong
  )

  // Calculate Loss/Contract: (price difference) * spyToMesRatio * eachPointsMesContract
  // For long: price goes down to support = loss, so negative
  // For short: price goes up to resistance = loss, so negative
  const priceDifference = isLong
    ? inputs.spyMarketPrice - scenario.priceLevel
    : scenario.priceLevel - inputs.spyMarketPrice
  const lossPerContract =
    -priceDifference * inputs.spyToMesPointsRatio * inputs.eachPointsMesContract

  const maxHands = calculateMaxHands(
    lossPerContract,
    inputs.initialBalance,
    inputs.overnightMargin
  )

  const playByGrid = assumePosition

  const maxHandsProbability = roundDown(maxHands * scenario.probability)
  const maxHandsSafeThreshold = roundDown(maxHandsProbability * inputs.safeThreshold)

  return {
    assumePosition,
    lossPerContract,
    playByGrid,
    maxHands,
    maxHandsProbability,
    maxHandsSafeThreshold,
  }
}

function calculateTotals(
  scenarios: Scenario[],
  inputs: RiskCalculatorInputs,
  isLong: boolean
): LongShortResults {
  const calculations = scenarios.map((scenario) => calculateScenario(scenario, inputs, isLong))

  const totalMaxHandsProbability = calculations.reduce(
    (sum, calc) => sum + calc.maxHandsProbability,
    0
  )

  const totalMaxHandsSafeThreshold = calculations.reduce(
    (sum, calc) => sum + calc.maxHandsSafeThreshold,
    0
  )

  // For short side: Playable Hands = -(Total Max Hands Safe Threshold) - position
  // For long side: Playable Hands = Total Max Hands Safe Threshold - position
  const playableHands = isLong
    ? totalMaxHandsSafeThreshold - inputs.position
    : -totalMaxHandsSafeThreshold - inputs.position

  return {
    totalMaxHandsProbability,
    totalMaxHandsSafeThreshold,
    playableHands,
  }
}

export default function RiskCalculatorPage() {
  const [inputs, setInputs] = useState<RiskCalculatorInputs>(DEFAULT_INPUTS)
  const [longScenarios, setLongScenarios] = useState<Scenario[]>(DEFAULT_LONG_SCENARIOS)
  const [shortScenarios, setShortScenarios] = useState<Scenario[]>(DEFAULT_SHORT_SCENARIOS)
  const [isLoaded, setIsLoaded] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed: RiskCalculatorState = JSON.parse(saved)
        setInputs(parsed.inputs)
        setLongScenarios(parsed.longScenarios)
        setShortScenarios(parsed.shortScenarios)
      }
    } catch (error) {
      console.error('Failed to load from localStorage:', error)
    } finally {
      setIsLoaded(true)
    }
  }, [])

  // Save to localStorage whenever state changes
  useEffect(() => {
    if (!isLoaded) return

    try {
      const state: RiskCalculatorState = {
        inputs,
        longScenarios,
        shortScenarios,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch (error) {
      console.error('Failed to save to localStorage:', error)
    }
  }, [inputs, longScenarios, shortScenarios, isLoaded])

  // Calculate results
  const longResults = useMemo(
    () => calculateTotals(longScenarios, inputs, true),
    [longScenarios, inputs]
  )

  const shortResults = useMemo(
    () => calculateTotals(shortScenarios, inputs, false),
    [shortScenarios, inputs]
  )

  // Reset to defaults
  const handleReset = () => {
    if (confirm('Reset all values to defaults? This cannot be undone.')) {
      setInputs(DEFAULT_INPUTS)
      setLongScenarios(DEFAULT_LONG_SCENARIOS)
      setShortScenarios(DEFAULT_SHORT_SCENARIOS)
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  // Update input
  const updateInput = (key: keyof RiskCalculatorInputs, value: number) => {
    setInputs((prev) => ({ ...prev, [key]: value }))
  }

  // Scenario management
  const addScenario = (isLong: boolean) => {
    const existingScenarios = isLong ? longScenarios : shortScenarios
    const scenarioNumber = existingScenarios.length + 1
    const newScenario: Scenario = {
      id: Date.now().toString(),
      priceLevel: inputs.spyMarketPrice,
      description: isLong ? `Scenario ${scenarioNumber}` : `Scenario ${scenarioNumber}`,
      probability: 0.1,
    }
    if (isLong) {
      setLongScenarios((prev) => [...prev, newScenario])
    } else {
      setShortScenarios((prev) => [...prev, newScenario])
    }
  }

  const removeScenario = (id: string, isLong: boolean) => {
    if (isLong) {
      setLongScenarios((prev) => prev.filter((s) => s.id !== id))
    } else {
      setShortScenarios((prev) => prev.filter((s) => s.id !== id))
    }
  }

  const updateScenario = (id: string, isLong: boolean, updates: Partial<Scenario>) => {
    if (isLong) {
      setLongScenarios((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
      )
    } else {
      setShortScenarios((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
      )
    }
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-pink-600/20 animate-pulse"></div>

      <div className="relative mx-auto max-w-7xl p-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-white mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Risk Control Calculator
          </h1>
          <p className="text-gray-300 text-lg">
            Calculate playable hands for long and short positions based on scenarios and probabilities
          </p>
        </motion.div>

        {/* Input Parameters Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-8"
        >
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900/80 to-zinc-950/80 border-2 border-zinc-800/50 p-6 backdrop-blur-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-white">Input Parameters</h2>
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Reset to Defaults
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Initial Balance
                </label>
                <input
                  type="number"
                  value={inputs.initialBalance}
                  onChange={(e) => updateInput('initialBalance', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Overnight Margin
                </label>
                <input
                  type="number"
                  value={inputs.overnightMargin}
                  onChange={(e) => updateInput('overnightMargin', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Buy Spy Grid Space
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={inputs.buySpyGridSpace}
                  onChange={(e) => updateInput('buySpyGridSpace', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  SPY Market Price
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={inputs.spyMarketPrice}
                  onChange={(e) => updateInput('spyMarketPrice', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Spy to MES Points Ratio
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={inputs.spyToMesPointsRatio}
                  onChange={(e) =>
                    updateInput('spyToMesPointsRatio', parseFloat(e.target.value) || 0)
                  }
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Each Points $ MES Contract
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={inputs.eachPointsMesContract}
                  onChange={(e) =>
                    updateInput('eachPointsMesContract', parseFloat(e.target.value) || 0)
                  }
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Safe Threshold
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={inputs.safeThreshold}
                  onChange={(e) =>
                    updateInput('safeThreshold', parseFloat(e.target.value) || 0)
                  }
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Position</label>
                <input
                  type="number"
                  value={inputs.position}
                  onChange={(e) => updateInput('position', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Results Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {/* Long Results */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-900/40 to-green-950/60 border-2 border-green-800/50 p-6 backdrop-blur-sm">
            <h3 className="text-xl font-bold text-white mb-4">Long Position Results</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-300">Total Max Hands (Probability):</span>
                <span className="text-white font-semibold">{longResults.totalMaxHandsProbability}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Total Max Hands (Safe Threshold):</span>
                <span className="text-white font-semibold">
                  {longResults.totalMaxHandsSafeThreshold}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-green-800">
                <span className="text-white font-bold">Playable Hands:</span>
                <span
                  className={`font-bold text-lg ${
                    longResults.playableHands >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {longResults.playableHands}
                </span>
              </div>
            </div>
          </div>

          {/* Short Results */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-900/40 to-red-950/60 border-2 border-red-800/50 p-6 backdrop-blur-sm">
            <h3 className="text-xl font-bold text-white mb-4">Short Position Results</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-300">Total Max Hands (Probability):</span>
                <span className="text-white font-semibold">{shortResults.totalMaxHandsProbability}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Total Max Hands (Safe Threshold):</span>
                <span className="text-white font-semibold">
                  {shortResults.totalMaxHandsSafeThreshold}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-red-800">
                <span className="text-white font-bold">Playable Hands:</span>
                <span
                  className={`font-bold text-lg ${
                    shortResults.playableHands >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {shortResults.playableHands}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Long and Short Scenarios */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          {/* Long Scenarios */}
          <ScenarioSection
            title="Long Position Scenarios"
            scenarios={longScenarios}
            inputs={inputs}
            isLong={true}
            onAdd={() => addScenario(true)}
            onRemove={(id) => removeScenario(id, true)}
            onUpdate={(id, updates) => updateScenario(id, true, updates)}
          />

          {/* Short Scenarios */}
          <ScenarioSection
            title="Short Position Scenarios"
            scenarios={shortScenarios}
            inputs={inputs}
            isLong={false}
            onAdd={() => addScenario(false)}
            onRemove={(id) => removeScenario(id, false)}
            onUpdate={(id, updates) => updateScenario(id, false, updates)}
          />
        </motion.div>
      </div>
    </div>
  )
}

interface ScenarioSectionProps {
  title: string
  scenarios: Scenario[]
  inputs: RiskCalculatorInputs
  isLong: boolean
  onAdd: () => void
  onRemove: (id: string) => void
  onUpdate: (id: string, updates: Partial<Scenario>) => void
}

function ScenarioSection({
  title,
  scenarios,
  inputs,
  isLong,
  onAdd,
  onRemove,
  onUpdate,
}: ScenarioSectionProps) {
  const borderColor = isLong ? 'border-green-800/50' : 'border-red-800/50'
  const bgGradient = isLong
    ? 'from-green-900/40 to-green-950/60'
    : 'from-red-900/40 to-red-950/60'

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${bgGradient} border-2 ${borderColor} p-6 backdrop-blur-sm`}
    >
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          <p className="text-sm text-gray-400 mt-1">
            Total Probability:{' '}
            <span
              className={`font-semibold ${
                Math.abs(
                  scenarios.reduce((sum, s) => sum + s.probability, 0) * 100 - 100
                ) < 0.01
                  ? 'text-green-400'
                  : 'text-yellow-400'
              }`}
            >
              {(scenarios.reduce((sum, s) => sum + s.probability, 0) * 100).toFixed(1)}%
            </span>
            {Math.abs(scenarios.reduce((sum, s) => sum + s.probability, 0) * 100 - 100) <
            0.01 ? (
              <span className="text-green-400 ml-2">✓</span>
            ) : (
              <span className="text-yellow-400 ml-2">
                (should be 100%)
              </span>
            )}
          </p>
        </div>
        <button
          onClick={onAdd}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
        >
          + Add Scenario
        </button>
      </div>

      {scenarios.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <p className="mb-4">No scenarios defined. Click &quot;+ Add Scenario&quot; to get started.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-2 px-2 text-gray-300 font-medium">
                  {isLong ? 'SPY Support' : 'SPY Resistance'}
                </th>
                <th className="text-left py-2 px-2 text-gray-300 font-medium">Scenario</th>
                <th className="text-right py-2 px-2 text-gray-300 font-medium">Probability</th>
                <th className="text-right py-2 px-2 text-gray-300 font-medium">Assume Pos</th>
                <th className="text-right py-2 px-2 text-gray-300 font-medium">Loss/Contract</th>
                <th className="text-right py-2 px-2 text-gray-300 font-medium">Max Hands</th>
                <th className="text-right py-2 px-2 text-gray-300 font-medium">Max (Prob)</th>
                <th className="text-right py-2 px-2 text-gray-300 font-medium">Max (Safe)</th>
                <th className="text-center py-2 px-2 text-gray-300 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {scenarios.map((scenario) => {
                const calc = calculateScenario(scenario, inputs, isLong)
                return (
                  <tr key={scenario.id} className="border-b border-gray-800/50 hover:bg-black/20">
                    <td className="py-2 px-2">
                      <input
                        type="number"
                        step="0.01"
                        value={scenario.priceLevel}
                        onChange={(e) =>
                          onUpdate(scenario.id, { priceLevel: parseFloat(e.target.value) || 0 })
                        }
                        className="w-20 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={scenario.description}
                        onChange={(e) => onUpdate(scenario.id, { description: e.target.value })}
                        className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Scenario description"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={(scenario.probability * 100).toFixed(1)}
                          onChange={(e) => {
                            const percentValue = parseFloat(e.target.value) || 0
                            const decimalValue = Math.max(0, Math.min(100, percentValue)) / 100
                            onUpdate(scenario.id, {
                              probability: decimalValue,
                            })
                          }}
                          className="w-16 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-white text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <span className="text-gray-400 text-xs">%</span>
                      </div>
                    </td>
                    <td className="py-2 px-2 text-right text-white">{calc.assumePosition}</td>
                    <td className="py-2 px-2 text-right text-white">
                      {calc.lossPerContract < 0 ? '-' : ''}${Math.abs(calc.lossPerContract).toLocaleString()}
                    </td>
                    <td className="py-2 px-2 text-right text-white">{calc.maxHands}</td>
                    <td className="py-2 px-2 text-right text-white">{calc.maxHandsProbability}</td>
                    <td className="py-2 px-2 text-right text-white font-semibold">
                      {calc.maxHandsSafeThreshold}
                    </td>
                    <td className="py-2 px-2 text-center">
                      <button
                        onClick={() => onRemove(scenario.id)}
                        className="text-red-400 hover:text-red-300 text-xs px-2 py-1 hover:bg-red-900/20 rounded transition-colors"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
