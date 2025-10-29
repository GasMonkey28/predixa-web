// Technical indicators commonly used in trading applications

export interface Bar {
  t: string
  o: number
  h: number
  l: number
  c: number
  v?: number
}

export interface TechnicalIndicator {
  name: string
  value: number
  signal: 'bullish' | 'bearish' | 'neutral'
}

// Simple Moving Average
export function calculateSMA(bars: Bar[], period: number): number[] {
  if (bars.length < period) return []
  
  const sma: number[] = []
  for (let i = period - 1; i < bars.length; i++) {
    const sum = bars.slice(i - period + 1, i + 1).reduce((acc, bar) => acc + bar.c, 0)
    sma.push(sum / period)
  }
  return sma
}

// Exponential Moving Average
export function calculateEMA(bars: Bar[], period: number): number[] {
  if (bars.length < period) return []
  
  const ema: number[] = []
  const multiplier = 2 / (period + 1)
  
  // First EMA is SMA
  const sma = calculateSMA(bars, period)
  ema.push(sma[0])
  
  for (let i = 1; i < sma.length; i++) {
    const currentEMA = (bars[i + period - 1].c - ema[i - 1]) * multiplier + ema[i - 1]
    ema.push(currentEMA)
  }
  
  return ema
}

// Relative Strength Index
export function calculateRSI(bars: Bar[], period: number = 14): number[] {
  if (bars.length < period + 1) return []
  
  const gains: number[] = []
  const losses: number[] = []
  
  // Calculate price changes
  for (let i = 1; i < bars.length; i++) {
    const change = bars[i].c - bars[i - 1].c
    gains.push(change > 0 ? change : 0)
    losses.push(change < 0 ? Math.abs(change) : 0)
  }
  
  const rsi: number[] = []
  
  // Calculate initial average gain and loss
  let avgGain = gains.slice(0, period).reduce((sum, gain) => sum + gain, 0) / period
  let avgLoss = losses.slice(0, period).reduce((sum, loss) => sum + loss, 0) / period
  
  if (avgLoss === 0) {
    rsi.push(100)
  } else {
    const rs = avgGain / avgLoss
    rsi.push(100 - (100 / (1 + rs)))
  }
  
  // Calculate subsequent RSI values
  for (let i = period; i < gains.length; i++) {
    avgGain = ((avgGain * (period - 1)) + gains[i]) / period
    avgLoss = ((avgLoss * (period - 1)) + losses[i]) / period
    
    if (avgLoss === 0) {
      rsi.push(100)
    } else {
      const rs = avgGain / avgLoss
      rsi.push(100 - (100 / (1 + rs)))
    }
  }
  
  return rsi
}

// MACD (Moving Average Convergence Divergence)
export function calculateMACD(bars: Bar[], fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9) {
  if (bars.length < slowPeriod) return { macd: [], signal: [], histogram: [] }
  
  const fastEMA = calculateEMA(bars, fastPeriod)
  const slowEMA = calculateEMA(bars, slowPeriod)
  
  // Adjust arrays to same length
  const startIndex = slowPeriod - fastPeriod
  const macd: number[] = []
  
  for (let i = 0; i < fastEMA.length; i++) {
    const fastIndex = i + startIndex
    if (fastIndex < slowEMA.length) {
      macd.push(fastEMA[i] - slowEMA[fastIndex])
    }
  }
  
  // Create bars array for signal line calculation
  const macdBars: Bar[] = macd.map((value, index) => ({
    t: bars[index + slowPeriod - 1].t,
    o: value,
    h: value,
    l: value,
    c: value
  }))
  
  const signal = calculateEMA(macdBars, signalPeriod)
  const histogram: number[] = []
  
  for (let i = 0; i < Math.min(macd.length, signal.length); i++) {
    histogram.push(macd[i + (macd.length - signal.length)] - signal[i])
  }
  
  return { macd, signal, histogram }
}

// Bollinger Bands
export function calculateBollingerBands(bars: Bar[], period: number = 20, stdDev: number = 2) {
  if (bars.length < period) return { upper: [], middle: [], lower: [] }
  
  const sma = calculateSMA(bars, period)
  const upper: number[] = []
  const lower: number[] = []
  
  for (let i = period - 1; i < bars.length; i++) {
    const slice = bars.slice(i - period + 1, i + 1)
    const mean = sma[i - period + 1]
    
    // Calculate standard deviation
    const variance = slice.reduce((sum, bar) => sum + Math.pow(bar.c - mean, 2), 0) / period
    const standardDeviation = Math.sqrt(variance)
    
    upper.push(mean + (stdDev * standardDeviation))
    lower.push(mean - (stdDev * standardDeviation))
  }
  
  return { upper, middle: sma, lower }
}

// Generate trading signals based on technical indicators
export function generateSignals(bars: Bar[]): TechnicalIndicator[] {
  const signals: TechnicalIndicator[] = []
  
  if (bars.length < 50) return signals // Need enough data
  
  // RSI Signal
  const rsi = calculateRSI(bars, 14)
  if (rsi.length > 0) {
    const currentRSI = rsi[rsi.length - 1]
    let rsiSignal: 'bullish' | 'bearish' | 'neutral' = 'neutral'
    
    if (currentRSI < 30) rsiSignal = 'bullish' // Oversold
    else if (currentRSI > 70) rsiSignal = 'bearish' // Overbought
    
    signals.push({
      name: 'RSI (14)',
      value: currentRSI,
      signal: rsiSignal
    })
  }
  
  // MACD Signal
  const macdData = calculateMACD(bars)
  if (macdData.macd.length > 0 && macdData.signal.length > 0) {
    const macd = macdData.macd[macdData.macd.length - 1]
    const signal = macdData.signal[macdData.signal.length - 1]
    const histogram = macdData.histogram[macdData.histogram.length - 1]
    
    let macdSignal: 'bullish' | 'bearish' | 'neutral' = 'neutral'
    if (macd > signal && histogram > 0) macdSignal = 'bullish'
    else if (macd < signal && histogram < 0) macdSignal = 'bearish'
    
    signals.push({
      name: 'MACD',
      value: macd,
      signal: macdSignal
    })
  }
  
  // Moving Average Signal
  const sma20 = calculateSMA(bars, 20)
  const sma50 = calculateSMA(bars, 50)
  
  if (sma20.length > 0 && sma50.length > 0) {
    const current20 = sma20[sma20.length - 1]
    const current50 = sma50[sma50.length - 1]
    const currentPrice = bars[bars.length - 1].c
    
    let maSignal: 'bullish' | 'bearish' | 'neutral' = 'neutral'
    if (currentPrice > current20 && current20 > current50) maSignal = 'bullish'
    else if (currentPrice < current20 && current20 < current50) maSignal = 'bearish'
    
    signals.push({
      name: 'Moving Averages',
      value: currentPrice,
      signal: maSignal
    })
  }
  
  return signals
}

// Generate trading recommendation based on technical analysis
export function generateRecommendation(bars: Bar[]) {
  if (!bars || bars.length < 20) {
    return {
      action: 'HOLD' as const,
      tier: 'C' as const,
      score: 5.0,
      confidence: 5.0,
      riskLevel: 'MEDIUM' as const,
      reasoning: 'Insufficient data for analysis',
      keyPoints: ['Waiting for more data points']
    }
  }

  const signals = generateSignals(bars)
  const currentPrice = bars[bars.length - 1].c
  const previousPrice = bars[bars.length - 2]?.c || currentPrice
  const priceChange = currentPrice - previousPrice
  const priceChangePercent = previousPrice ? (priceChange / previousPrice) * 100 : 0

  // Count bullish and bearish signals
  let bullishSignals = 0
  let bearishSignals = 0
  let totalSignals = signals.length

  signals.forEach(signal => {
    if (signal.signal === 'bullish') bullishSignals++
    else if (signal.signal === 'bearish') bearishSignals++
  })

  // Calculate score based on signals and price momentum
  let score = 5.0 // Base score
  score += (bullishSignals - bearishSignals) * 0.5
  score += Math.min(Math.max(priceChangePercent * 10, -2), 2) // Price momentum factor

  // Determine action
  let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD'
  if (score >= 7) action = 'BUY'
  else if (score <= 3) action = 'SELL'

  // Determine tier
  let tier: 'S' | 'A' | 'B' | 'C' | 'D' = 'C'
  if (score >= 8) tier = 'S'
  else if (score >= 6.5) tier = 'A'
  else if (score >= 4.5) tier = 'B'
  else if (score >= 2.5) tier = 'C'
  else tier = 'D'

  // Calculate confidence
  const confidence = Math.min(Math.max(score + (totalSignals * 0.2), 1), 10)

  // Determine risk level
  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM'
  if (Math.abs(priceChangePercent) > 2) riskLevel = 'HIGH'
  else if (Math.abs(priceChangePercent) < 0.5) riskLevel = 'LOW'

  // Generate reasoning
  const reasoning = `Based on ${totalSignals} technical indicators: ${bullishSignals} bullish, ${bearishSignals} bearish signals. Price momentum: ${priceChangePercent >= 0 ? '+' : ''}${priceChangePercent.toFixed(2)}%`

  // Generate key points
  const keyPoints: string[] = []
  if (bullishSignals > bearishSignals) {
    keyPoints.push('Technical indicators favor bullish sentiment')
  } else if (bearishSignals > bullishSignals) {
    keyPoints.push('Technical indicators suggest bearish pressure')
  }
  
  if (Math.abs(priceChangePercent) > 1) {
    keyPoints.push(`Strong price movement: ${priceChangePercent >= 0 ? '+' : ''}${priceChangePercent.toFixed(2)}%`)
  }
  
  if (signals.some(s => s.name === 'RSI (14)' && s.value < 30)) {
    keyPoints.push('RSI indicates oversold conditions')
  } else if (signals.some(s => s.name === 'RSI (14)' && s.value > 70)) {
    keyPoints.push('RSI indicates overbought conditions')
  }

  if (keyPoints.length === 0) {
    keyPoints.push('Mixed signals from technical analysis')
  }

  return {
    action,
    tier,
    score: Math.round(score * 10) / 10,
    confidence: Math.round(confidence * 10) / 10,
    riskLevel,
    reasoning,
    keyPoints
  }
}