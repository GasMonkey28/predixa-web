export type InstrumentType = 'stock' | 'future' | 'mini_future'

export interface TradeJournalEntry {
  id: string
  entryDate: string
  no: number
  instrumentType: InstrumentType
  positionSize: number
  buyPrice: number | null
  soldPrice: number | null
  targetPrice: number | null
  profit: number | null
  reason: string
  rating: string
}

export interface TradeJournalDocument {
  userId: string
  entries: TradeJournalEntry[]
  updatedAt: string
}

export const INSTRUMENT_OPTIONS: {
  value: InstrumentType
  label: string
  shortLabel: string
  multiplier: number
  sizeLabel: string
}[] = [
  { value: 'mini_future', label: 'E-mini (MES)', shortLabel: 'MES', multiplier: 5, sizeLabel: 'Contracts' },
  { value: 'future', label: 'Future (ES)', shortLabel: 'ES', multiplier: 50, sizeLabel: 'Contracts' },
  { value: 'stock', label: 'Stock', shortLabel: 'Stk', multiplier: 1, sizeLabel: 'Shares' },
]

export const DEFAULT_INSTRUMENT_TYPE: InstrumentType = 'mini_future'

export function getPointMultiplier(instrumentType: InstrumentType): number {
  const option = INSTRUMENT_OPTIONS.find((item) => item.value === instrumentType)
  return option?.multiplier ?? 5
}

export function getSizeLabel(instrumentType: InstrumentType): string {
  const option = INSTRUMENT_OPTIONS.find((item) => item.value === instrumentType)
  return option?.sizeLabel ?? 'Contracts'
}

function coerceNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

/** Positive buy = long; negative buy = short opened at |buy|. */
export function isShortPosition(buyPrice: number | null): boolean {
  return buyPrice != null && buyPrice < 0
}

export function isLongPosition(buyPrice: number | null): boolean {
  return buyPrice != null && buyPrice > 0
}

/** Open = buy entered, sold not yet filled. */
export function isOpenPosition(entry: Pick<TradeJournalEntry, 'buyPrice' | 'soldPrice'>): boolean {
  const buy = entry.buyPrice
  return buy != null && buy !== 0 && entry.soldPrice == null
}

/** Point P&L before size and multiplier. */
export function calcPointPnL(buyPrice: number | null, soldPrice: number | null): number | null {
  if (buyPrice == null || soldPrice == null || Number.isNaN(buyPrice) || Number.isNaN(soldPrice)) {
    return null
  }
  if (buyPrice < 0) {
    return -buyPrice - soldPrice
  }
  return soldPrice - buyPrice
}

/** Dollar P&L: point P&L × position size × instrument multiplier */
export function calcProfit(
  buyPrice: number | null,
  soldPrice: number | null,
  instrumentType: InstrumentType = DEFAULT_INSTRUMENT_TYPE,
  positionSize = 1
): number | null {
  const points = calcPointPnL(buyPrice, soldPrice)
  if (points == null) return null
  const size = positionSize > 0 ? positionSize : 1
  return points * size * getPointMultiplier(instrumentType)
}

/** Open longs: 1, 2, 3… Open shorts: −1, −2, −3… Cleared once sold is filled. */
export function getTradeNumber(entries: TradeJournalEntry[], entryId: string): number | null {
  const target = entries.find((entry) => entry.id === entryId)
  if (!target || !isOpenPosition(target)) return null

  let longCount = 0
  let shortCount = 0
  for (const entry of entries) {
    if (!isOpenPosition(entry)) continue
    const buy = entry.buyPrice!
    if (buy < 0) {
      shortCount += 1
      if (entry.id === entryId) return -shortCount
    } else if (buy > 0) {
      longCount += 1
      if (entry.id === entryId) return longCount
    }
  }
  return null
}

export function renumberEntries(entries: TradeJournalEntry[]): TradeJournalEntry[] {
  return entries.map((entry) => {
    const no = getTradeNumber(entries, entry.id) ?? 0
    return withRecalculatedProfit({ ...entry, no })
  })
}

export interface OpenPositionSummary {
  highestLong: number
  highestShort: number
  netPosition: number
}

/** Net = highest open long + highest open short (e.g. 3 + (−2) = 1). */
export function calcOpenPositionSummary(entries: TradeJournalEntry[]): OpenPositionSummary {
  let highestLong = 0
  let highestShort = 0

  for (const entry of entries) {
    if (!isOpenPosition(entry)) continue
    const num = getTradeNumber(entries, entry.id)
    if (num == null) continue
    if (num > 0) highestLong = Math.max(highestLong, num)
    else if (num < 0) highestShort = Math.min(highestShort, num)
  }

  return {
    highestLong,
    highestShort,
    netPosition: highestLong + highestShort,
  }
}

export function withRecalculatedProfit(entry: TradeJournalEntry): TradeJournalEntry {
  return {
    ...entry,
    profit: calcProfit(entry.buyPrice, entry.soldPrice, entry.instrumentType, entry.positionSize),
  }
}

export function normalizeEntry(entry: Partial<TradeJournalEntry>, index: number): TradeJournalEntry {
  const instrumentType =
    entry.instrumentType === 'stock' ||
    entry.instrumentType === 'future' ||
    entry.instrumentType === 'mini_future'
      ? entry.instrumentType
      : DEFAULT_INSTRUMENT_TYPE

  const positionSize =
    typeof entry.positionSize === 'number' && entry.positionSize > 0 ? entry.positionSize : 1

  const normalized: TradeJournalEntry = {
    id: typeof entry.id === 'string' && entry.id ? entry.id : `entry-${index}`,
    entryDate: typeof entry.entryDate === 'string' ? entry.entryDate : '',
    no: typeof entry.no === 'number' ? entry.no : 0,
    instrumentType,
    positionSize,
    buyPrice: coerceNumber(entry.buyPrice),
    soldPrice: coerceNumber(entry.soldPrice),
    targetPrice: coerceNumber(entry.targetPrice),
    profit: null,
    reason: typeof entry.reason === 'string' ? entry.reason : '',
    rating: typeof entry.rating === 'string' ? entry.rating : '',
  }

  return withRecalculatedProfit(normalized)
}

export function createEmptyEntry(no: number): TradeJournalEntry {
  return normalizeEntry(
    {
      id: crypto.randomUUID(),
      entryDate: new Date().toISOString().slice(0, 10),
      no,
      instrumentType: DEFAULT_INSTRUMENT_TYPE,
      positionSize: 1,
      buyPrice: null,
      soldPrice: null,
      targetPrice: null,
      reason: '',
      rating: '',
    },
    no - 1
  )
}
