import { fetchAuthSession } from 'aws-amplify/auth'
import {
  MonthlyProfitEntry,
  normalizeEntry,
  normalizeMonthlyProfitEntry,
  normalizeSacrificePoolEntry,
  SacrificePoolEntry,
  TradeJournalData,
  TradeJournalEntry,
} from '@/lib/trade-journal-types'

const LOCAL_STORAGE_KEY = 'predixa-trade-journal'

function localKey(userId?: string | null) {
  return userId ? `${LOCAL_STORAGE_KEY}:${userId}` : LOCAL_STORAGE_KEY
}

function normalizeSacrificePool(raw: unknown): SacrificePoolEntry[] {
  return Array.isArray(raw)
    ? raw.map((entry, index) =>
        normalizeSacrificePoolEntry(entry as Partial<SacrificePoolEntry>, index)
      )
    : []
}

function normalizeData(raw: unknown): TradeJournalData {
  if (Array.isArray(raw)) {
    return {
      entries: raw.map((entry, index) => normalizeEntry(entry as Partial<TradeJournalEntry>, index)),
      monthlyProfitEntries: [],
      sacrificePoolEntries: [],
    }
  }

  if (!raw || typeof raw !== 'object') {
    return { entries: [], monthlyProfitEntries: [], sacrificePoolEntries: [] }
  }

  const data = raw as {
    entries?: unknown
    monthlyProfitEntries?: unknown
    sacrificePoolEntries?: unknown
  }

  const entries = Array.isArray(data.entries)
    ? data.entries.map((entry, index) => normalizeEntry(entry as Partial<TradeJournalEntry>, index))
    : []

  const monthlyProfitEntries = Array.isArray(data.monthlyProfitEntries)
    ? data.monthlyProfitEntries.map((entry, index) =>
        normalizeMonthlyProfitEntry(entry as Partial<MonthlyProfitEntry>, index)
      )
    : []

  return {
    entries,
    monthlyProfitEntries,
    sacrificePoolEntries: normalizeSacrificePool(data.sacrificePoolEntries),
  }
}

export async function loadTradeJournal(userId?: string | null): Promise<TradeJournalData> {
  if (typeof window === 'undefined') {
    return { entries: [], monthlyProfitEntries: [], sacrificePoolEntries: [] }
  }

  try {
    const headers: HeadersInit = { 'Content-Type': 'application/json' }
    const session = await fetchAuthSession()
    const idToken = session.tokens?.idToken?.toString()
    if (idToken) {
      headers.Authorization = `Bearer ${idToken}`
      const response = await fetch('/api/trade-journal', {
        method: 'GET',
        headers,
        cache: 'no-store',
        credentials: 'include',
      })
      if (response.ok) {
        const data = (await response.json()) as {
          entries?: unknown
          monthlyProfitEntries?: unknown
        }
        const normalized = normalizeData(data)
        localStorage.setItem(localKey(userId), JSON.stringify(normalized))
        return normalized
      }
    }
  } catch (error) {
    console.warn('Trade journal API load failed, using local backup:', error)
  }

  try {
    const saved = localStorage.getItem(localKey(userId))
    if (saved) return normalizeData(JSON.parse(saved))
  } catch (error) {
    console.error('Failed to load trade journal from localStorage:', error)
  }

  return { entries: [], monthlyProfitEntries: [], sacrificePoolEntries: [] }
}

/** @deprecated Use loadTradeJournal */
export async function loadTradeJournalEntries(userId?: string | null): Promise<TradeJournalEntry[]> {
  const data = await loadTradeJournal(userId)
  return data.entries
}

export async function saveTradeJournal(
  data: TradeJournalData,
  userId?: string | null
): Promise<void> {
  if (typeof window === 'undefined') return

  localStorage.setItem(localKey(userId), JSON.stringify(data))

  try {
    const headers: HeadersInit = { 'Content-Type': 'application/json' }
    const session = await fetchAuthSession()
    const idToken = session.tokens?.idToken?.toString()
    if (!idToken) return

    headers.Authorization = `Bearer ${idToken}`
    await fetch('/api/trade-journal', {
      method: 'PUT',
      headers,
      credentials: 'include',
      body: JSON.stringify(data),
    })
  } catch (error) {
    console.warn('Trade journal API save failed; kept local backup:', error)
  }
}

/** @deprecated Use saveTradeJournal */
export async function saveTradeJournalEntries(
  entries: TradeJournalEntry[],
  userId?: string | null
): Promise<void> {
  await saveTradeJournal({ entries, monthlyProfitEntries: [], sacrificePoolEntries: [] }, userId)
}
