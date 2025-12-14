export interface RiskCalculatorInputs {
  initialBalance: number
  overnightMargin: number
  buySpyGridSpace: number
  spyMarketPrice: number
  spyToMesPointsRatio: number
  eachPointsMesContract: number
  safeThreshold: number
  position: number
}

export interface Scenario {
  id: string
  priceLevel: number
  description: string
  probability: number
}

export interface ScenarioCalculation {
  assumePosition: number
  totalLoss: number
  adjustedBalance: number
  holdingCost: number
  extraAvailableMoney: number
  lossPerContract: number
  playByGrid: number
  maxHands: number
  maxHandsProbability: number
  maxHandsSafeThreshold: number
}

export interface LongShortResults {
  totalMaxHandsProbability: number
  totalMaxHandsSafeThreshold: number
  playableHands: number
}

export interface RiskCalculatorState {
  inputs: RiskCalculatorInputs
  longScenarios: Scenario[]
  shortScenarios: Scenario[]
}
