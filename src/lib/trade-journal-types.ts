export type InstrumentType = 'stock' | 'future' | 'mini_future'

export interface TradeJournalEntry {
  id: string
  entryDate: string
  /** YYYY-MM-DD when position was closed (sold filled). */
  closeDate: string | null
  /** Optional YYYY-MM bucket for monthly P&L (defaults to entry date month). */
  profitMonth: string | null
  no: number
  instrumentType: InstrumentType
  positionSize: number
  buyPrice: number | null
  soldPrice: number | null
  targetPrice: number | null
  profit: number | null
  /** M1/M2 signals for entry (open) day. */
  reason: string
  /** M1/M2 signals for close (take profit) day. */
  closeReason: string | null
  rating: string
  /** Point P&L transferred to another position (excluded from monthly P&L). */
  pointsContributed: number | null
  contributedToEntryId: string | null
  /**
   * Point P&L (usually a loss) parked in the per-instrument Sacrifice pool instead
   * of being booked to monthly P&L. Set when the position was closed via "Sacrifice".
   */
  pointsSacrificed?: number | null
  source?: 'manual' | 'tradestation'
  externalId?: string | null
  tradestationBuyFillId?: string | null
  tradestationSoldFillId?: string | null
}

/** Manual profit line assigned to a month (carry-over, corrections, etc.). */
export interface MonthlyProfitEntry {
  id: string
  monthKey: string
  amount: number
  note: string
}

/**
 * One lot in the per-instrument Sacrifice pool. `points` is signed:
 * a sacrificed loss is negative, a later profit contribution is positive.
 * The running pool total = sum of all lots for that instrument, and it is
 * deliberately kept out of monthly P&L until the user resolves it.
 */
export interface SacrificePoolEntry {
  id: string
  instrumentType: InstrumentType
  points: number
  date: string
  note: string
  kind: 'sacrifice' | 'contribution' | 'manual'
  sourceEntryId: string | null
}

export interface SacrificePoolTotal {
  instrumentType: InstrumentType
  label: string
  points: number
  sacrificeCount: number
  contributionCount: number
}

export interface TradeJournalData {
  entries: TradeJournalEntry[]
  monthlyProfitEntries: MonthlyProfitEntry[]
  sacrificePoolEntries: SacrificePoolEntry[]
}

export interface TradeJournalDocument extends TradeJournalData {
  userId: string
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

function compareEntryDateOrder(
  a: TradeJournalEntry,
  b: TradeJournalEntry,
  indexA: number,
  indexB: number
): number {
  const dateCmp = (a.entryDate || '9999-12-31').localeCompare(b.entryDate || '9999-12-31')
  if (dateCmp !== 0) return dateCmp
  return indexA - indexB
}

function sortedOpenPositionsByEntryDate(
  entries: TradeJournalEntry[],
  side: 'long' | 'short'
): TradeJournalEntry[] {
  return entries
    .map((entry, index) => ({ entry, index }))
    .filter(({ entry }) => {
      if (!isOpenPosition(entry)) return false
      const buy = entry.buyPrice!
      return side === 'long' ? buy > 0 : buy < 0
    })
    .sort((a, b) => compareEntryDateOrder(a.entry, b.entry, a.index, b.index))
    .map(({ entry }) => entry)
}

/** Open longs: 1, 2, 3… Open shorts: −1, −2, −3… by entry date (earliest = 1). */
export function getTradeNumber(entries: TradeJournalEntry[], entryId: string): number | null {
  const target = entries.find((entry) => entry.id === entryId)
  if (!target || !isOpenPosition(target)) return null

  const buy = target.buyPrice!
  if (buy === 0) return null

  const side: 'long' | 'short' = buy < 0 ? 'short' : 'long'
  const sorted = sortedOpenPositionsByEntryDate(entries, side)
  const index = sorted.findIndex((entry) => entry.id === entryId)
  if (index < 0) return null

  const number = index + 1
  return side === 'short' ? -number : number
}

export function sortEntriesByEntryDate(
  entries: TradeJournalEntry[],
  direction: 'asc' | 'desc'
): TradeJournalEntry[] {
  return [...entries].sort((a, b) => {
    const cmp = (a.entryDate || '9999-12-31').localeCompare(b.entryDate || '9999-12-31')
    return direction === 'asc' ? cmp : -cmp
  })
}

/** Apply futures roll diff to all open positions: long += diff, short -= diff. */
export function applyRollOverDiff(
  entries: TradeJournalEntry[],
  rollDiff: number
): TradeJournalEntry[] {
  return renumberEntries(
    entries.map((entry) => {
      if (!isOpenPosition(entry) || entry.buyPrice == null || entry.buyPrice === 0) {
        return entry
      }
      const buy = entry.buyPrice
      const newBuy = buy > 0 ? buy + rollDiff : buy - rollDiff
      return withRecalculatedProfit({ ...entry, buyPrice: newBuy })
    })
  )
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

export function getEntryProfit(entry: TradeJournalEntry): number | null {
  if (entry.pointsContributed != null && entry.soldPrice != null) return 0
  // Sacrificed positions moved their (loss) points to the parked pool, not monthly P&L.
  if (entry.pointsSacrificed != null && entry.soldPrice != null) return 0
  return (
    entry.profit ??
    calcProfit(entry.buyPrice, entry.soldPrice, entry.instrumentType, entry.positionSize)
  )
}

/** Shift entry by contributed points: long −pts (lower buy), short −pts (higher |entry|). */
export function applyPointsToBuyPrice(buyPrice: number, points: number): number {
  return buyPrice - points
}

export interface ContributeRecipientTarget {
  entry: TradeJournalEntry
  tradeNo: number | null
  newBuyPrice: number
}

export function getContributeRecipientTargets(
  entries: TradeJournalEntry[],
  sourceEntryId: string,
  points: number,
  instrumentType?: InstrumentType
): ContributeRecipientTarget[] {
  return entries
    .filter((entry) => {
      if (entry.id === sourceEntryId || !isOpenPosition(entry)) return false
      if (instrumentType && entry.instrumentType !== instrumentType) return false
      return entry.buyPrice != null && entry.buyPrice !== 0
    })
    .map((entry) => ({
      entry,
      tradeNo: getTradeNumber(entries, entry.id),
      newBuyPrice: applyPointsToBuyPrice(entry.buyPrice!, points),
    }))
}

export interface MonthlyProfitSummary {
  monthKey: string
  label: string
  tradeTotal: number
  adjustmentTotal: number
  total: number
  tradeCount: number
  adjustmentCount: number
}

function isValidMonthKey(value: string | null | undefined): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}$/.test(value)
}

export function getCurrentMonthKey(timeZone = 'America/New_York'): string {
  return new Date().toLocaleDateString('en-CA', { timeZone }).slice(0, 7)
}

export function monthKeyFromDate(date: string | null | undefined): string | null {
  if (!date || !/^\d{4}-\d{2}-\d{2}/.test(date)) return null
  const monthKey = date.slice(0, 7)
  return isValidMonthKey(monthKey) ? monthKey : null
}

export function getProfitMonthKey(entry: TradeJournalEntry): string | null {
  if (isValidMonthKey(entry.profitMonth)) return entry.profitMonth

  // Closed trades count in the close month (e.g. July take-profit → July P&L).
  if (entry.soldPrice != null) {
    const fromClose = monthKeyFromDate(entry.closeDate)
    if (fromClose) return fromClose
  }

  return monthKeyFromDate(entry.entryDate)
}

/** Default P&L month when a trade is closed (blank profitMonth only). */
export function defaultProfitMonthOnClose(
  entry: Pick<TradeJournalEntry, 'profitMonth' | 'closeDate'>
): string | null {
  if (isValidMonthKey(entry.profitMonth)) return null
  return monthKeyFromDate(entry.closeDate)
}

export function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number)
  if (!year || !month) return monthKey
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  })
}

type MonthBucket = {
  tradeTotal: number
  tradeCount: number
  adjustmentTotal: number
  adjustmentCount: number
}

function getOrCreateMonthBucket(
  byMonth: Map<string, MonthBucket>,
  monthKey: string
): MonthBucket {
  const bucket = byMonth.get(monthKey) ?? {
    tradeTotal: 0,
    tradeCount: 0,
    adjustmentTotal: 0,
    adjustmentCount: 0,
  }
  byMonth.set(monthKey, bucket)
  return bucket
}

/** Sum trade + manual profit by month. Newest month first. */
export function calcMonthlyProfitSummaries(
  entries: TradeJournalEntry[],
  monthlyProfitEntries: MonthlyProfitEntry[] = []
): MonthlyProfitSummary[] {
  const byMonth = new Map<string, MonthBucket>()

  for (const entry of entries) {
    const profit = getEntryProfit(entry)
    if (profit == null) continue

    const monthKey = getProfitMonthKey(entry)
    if (!monthKey) continue

    const bucket = getOrCreateMonthBucket(byMonth, monthKey)
    bucket.tradeTotal += profit
    bucket.tradeCount += 1
  }

  for (const line of monthlyProfitEntries) {
    if (!isValidMonthKey(line.monthKey)) continue
    const bucket = getOrCreateMonthBucket(byMonth, line.monthKey)
    bucket.adjustmentTotal += line.amount
    bucket.adjustmentCount += 1
  }

  return Array.from(byMonth.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([monthKey, bucket]) => ({
      monthKey,
      label: formatMonthLabel(monthKey),
      tradeTotal: bucket.tradeTotal,
      adjustmentTotal: bucket.adjustmentTotal,
      total: bucket.tradeTotal + bucket.adjustmentTotal,
      tradeCount: bucket.tradeCount,
      adjustmentCount: bucket.adjustmentCount,
    }))
}

/** Ensure month cards exist (e.g. current month at $0 next to prior months). */
export function ensureMonthsInSummaries(
  summaries: MonthlyProfitSummary[],
  monthKeys: string[]
): MonthlyProfitSummary[] {
  const byKey = new Map(summaries.map((summary) => [summary.monthKey, summary]))

  for (const monthKey of monthKeys) {
    if (!isValidMonthKey(monthKey) || byKey.has(monthKey)) continue
    byKey.set(monthKey, {
      monthKey,
      label: formatMonthLabel(monthKey),
      tradeTotal: 0,
      adjustmentTotal: 0,
      total: 0,
      tradeCount: 0,
      adjustmentCount: 0,
    })
  }

  return Array.from(byKey.values()).sort((a, b) => b.monthKey.localeCompare(a.monthKey))
}

export function normalizeMonthlyProfitEntry(
  entry: Partial<MonthlyProfitEntry>,
  index: number
): MonthlyProfitEntry {
  const monthKey =
    typeof entry.monthKey === 'string' && isValidMonthKey(entry.monthKey)
      ? entry.monthKey
      : getCurrentMonthKey()

  return {
    id: typeof entry.id === 'string' && entry.id ? entry.id : `month-profit-${index}`,
    monthKey,
    amount: coerceNumber(entry.amount) ?? 0,
    note: typeof entry.note === 'string' ? entry.note : '',
  }
}

export function createMonthlyProfitEntry(monthKey?: string): MonthlyProfitEntry {
  return normalizeMonthlyProfitEntry(
    {
      id: crypto.randomUUID(),
      monthKey: monthKey ?? getCurrentMonthKey(),
      amount: 0,
      note: '',
    },
    0
  )
}

function instrumentShortLabel(instrumentType: InstrumentType): string {
  return INSTRUMENT_OPTIONS.find((o) => o.value === instrumentType)?.shortLabel ?? instrumentType
}

export function normalizeSacrificePoolEntry(
  entry: Partial<SacrificePoolEntry>,
  index: number
): SacrificePoolEntry {
  const instrumentType =
    entry.instrumentType === 'stock' ||
    entry.instrumentType === 'future' ||
    entry.instrumentType === 'mini_future'
      ? entry.instrumentType
      : DEFAULT_INSTRUMENT_TYPE

  const kind =
    entry.kind === 'sacrifice' || entry.kind === 'contribution' || entry.kind === 'manual'
      ? entry.kind
      : 'sacrifice'

  return {
    id: typeof entry.id === 'string' && entry.id ? entry.id : `sacrifice-${index}`,
    instrumentType,
    points: coerceNumber(entry.points) ?? 0,
    date:
      typeof entry.date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(entry.date)
        ? entry.date.slice(0, 10)
        : new Date().toISOString().slice(0, 10),
    note: typeof entry.note === 'string' ? entry.note : '',
    kind,
    sourceEntryId: typeof entry.sourceEntryId === 'string' ? entry.sourceEntryId : null,
  }
}

export function createSacrificePoolEntry(
  data: Partial<SacrificePoolEntry> & { points: number; instrumentType: InstrumentType }
): SacrificePoolEntry {
  return normalizeSacrificePoolEntry(
    {
      id: crypto.randomUUID(),
      date: new Date().toISOString().slice(0, 10),
      note: '',
      kind: 'sacrifice',
      sourceEntryId: null,
      ...data,
    },
    0
  )
}

/** Running Sacrifice-pool total per instrument. Only instruments with activity are returned. */
export function calcSacrificePoolTotals(
  poolEntries: SacrificePoolEntry[] = []
): SacrificePoolTotal[] {
  const byInstrument = new Map<InstrumentType, SacrificePoolTotal>()

  for (const entry of poolEntries) {
    const current =
      byInstrument.get(entry.instrumentType) ?? {
        instrumentType: entry.instrumentType,
        label: instrumentShortLabel(entry.instrumentType),
        points: 0,
        sacrificeCount: 0,
        contributionCount: 0,
      }
    current.points += entry.points
    if (entry.kind === 'contribution') current.contributionCount += 1
    else if (entry.kind === 'sacrifice') current.sacrificeCount += 1
    byInstrument.set(entry.instrumentType, current)
  }

  return Array.from(byInstrument.values()).sort((a, b) => a.label.localeCompare(b.label))
}

export function getSacrificePoolPoints(
  poolEntries: SacrificePoolEntry[] = [],
  instrumentType: InstrumentType
): number {
  return poolEntries
    .filter((entry) => entry.instrumentType === instrumentType)
    .reduce((sum, entry) => sum + entry.points, 0)
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

  const profitMonth =
    typeof entry.profitMonth === 'string' && isValidMonthKey(entry.profitMonth)
      ? entry.profitMonth
      : null

  const normalized: TradeJournalEntry = {
    id: typeof entry.id === 'string' && entry.id ? entry.id : `entry-${index}`,
    entryDate: typeof entry.entryDate === 'string' ? entry.entryDate : '',
    closeDate:
      typeof entry.closeDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(entry.closeDate)
        ? entry.closeDate
        : null,
    profitMonth,
    no: typeof entry.no === 'number' ? entry.no : 0,
    instrumentType,
    positionSize,
    buyPrice: coerceNumber(entry.buyPrice),
    soldPrice: coerceNumber(entry.soldPrice),
    targetPrice: coerceNumber(entry.targetPrice),
    profit: null,
    reason: typeof entry.reason === 'string' ? entry.reason : '',
    closeReason: typeof entry.closeReason === 'string' ? entry.closeReason : null,
    pointsContributed: coerceNumber(entry.pointsContributed),
    contributedToEntryId:
      typeof entry.contributedToEntryId === 'string' ? entry.contributedToEntryId : null,
    pointsSacrificed: coerceNumber(entry.pointsSacrificed),
    rating: typeof entry.rating === 'string' ? entry.rating : '',
    source: entry.source === 'tradestation' ? 'tradestation' : 'manual',
    externalId: typeof entry.externalId === 'string' ? entry.externalId : null,
    tradestationBuyFillId:
      typeof entry.tradestationBuyFillId === 'string' ? entry.tradestationBuyFillId : null,
    tradestationSoldFillId:
      typeof entry.tradestationSoldFillId === 'string' ? entry.tradestationSoldFillId : null,
  }

  return withRecalculatedProfit(normalized)
}

export function createEmptyEntry(no: number): TradeJournalEntry {
  return normalizeEntry(
    {
      id: crypto.randomUUID(),
      entryDate: new Date().toISOString().slice(0, 10),
      closeDate: null,
      profitMonth: null,
      no,
      instrumentType: DEFAULT_INSTRUMENT_TYPE,
      positionSize: 1,
      buyPrice: null,
      soldPrice: null,
      targetPrice: null,
      reason: '',
      closeReason: null,
      pointsContributed: null,
      contributedToEntryId: null,
      rating: '',
    },
    no - 1
  )
}
