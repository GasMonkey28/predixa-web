import { fetchAuthSession } from 'aws-amplify/auth'
import { TradeJournalEntry } from '@/lib/trade-journal-types'

const LOCAL_STORAGE_KEY = 'predixa-trade-journal'

function localKey(userId?: string | null) {
  return userId ? `${LOCAL_STORAGE_KEY}:${userId}` : LOCAL_STORAGE_KEY
}

export async function loadTradeJournalEntries(userId?: string | null): Promise<TradeJournalEntry[]> {
  if (typeof window === 'undefined') return []

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
        const data = (await response.json()) as { entries?: TradeJournalEntry[] }
        if (Array.isArray(data.entries)) {
          localStorage.setItem(localKey(userId), JSON.stringify(data.entries))
          return data.entries
        }
      }
    }
  } catch (error) {
    console.warn('Trade journal API load failed, using local backup:', error)
  }

  try {
    const saved = localStorage.getItem(localKey(userId))
    if (saved) {
      const parsed = JSON.parse(saved) as TradeJournalEntry[]
      if (Array.isArray(parsed)) return parsed
    }
  } catch (error) {
    console.error('Failed to load trade journal from localStorage:', error)
  }

  return []
}

export async function saveTradeJournalEntries(
  entries: TradeJournalEntry[],
  userId?: string | null
): Promise<void> {
  if (typeof window === 'undefined') return

  localStorage.setItem(localKey(userId), JSON.stringify(entries))

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
      body: JSON.stringify({ entries }),
    })
  } catch (error) {
    console.warn('Trade journal API save failed; kept local backup:', error)
  }
}
