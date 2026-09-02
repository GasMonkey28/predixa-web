import { NextRequest, NextResponse } from 'next/server'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb'

import { SESSION_COOKIE_NAME } from '@/lib/constants'
import { config } from '@/lib/server/config'
import {
  MonthlyProfitEntry,
  normalizeEntry,
  normalizeMonthlyProfitEntry,
  normalizeSacrificePoolEntry,
  SacrificePoolEntry,
  TradeJournalData,
  TradeJournalEntry,
} from '@/lib/trade-journal-types'

const client = new DynamoDBClient({
  region: config.aws.region,
  credentials:
    config.aws.accessKeyId && config.aws.secretAccessKey
      ? {
          accessKeyId: config.aws.accessKeyId,
          secretAccessKey: config.aws.secretAccessKey,
        }
      : undefined,
})

const docClient = DynamoDBDocumentClient.from(client)
const TABLE_NAME = process.env.TRADE_JOURNAL_TABLE || 'TradeJournal'

function extractIdToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length).trim() || null
  }

  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value
  if (sessionCookie) return sessionCookie

  const candidateNames = [
    config.cognito.clientId ? `CognitoIdentityServiceProvider.${config.cognito.clientId}.idToken` : null,
    'CognitoIdentityServiceProvider.undefined.idToken',
  ].filter(Boolean) as string[]

  for (const name of candidateNames) {
    const value = request.cookies.get(name)?.value
    if (value) return value
  }

  for (const cookie of request.cookies.getAll()) {
    if (cookie.name.includes('idToken') && cookie.value) {
      return cookie.value
    }
  }

  return null
}

function getUserIdFromToken(idToken: string): string | null {
  try {
    const payload = idToken.split('.')[1]
    if (!payload) return null
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { sub?: string }
    return decoded.sub || null
  } catch {
    return null
  }
}

function sanitizeEntries(entries: unknown): TradeJournalEntry[] {
  if (!Array.isArray(entries)) return []

  return entries
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry, index) => normalizeEntry(entry as Partial<TradeJournalEntry>, index))
}

function sanitizeMonthlyProfitEntries(entries: unknown): MonthlyProfitEntry[] {
  if (!Array.isArray(entries)) return []

  return entries
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry, index) => normalizeMonthlyProfitEntry(entry as Partial<MonthlyProfitEntry>, index))
}

function sanitizeSacrificePoolEntries(entries: unknown): SacrificePoolEntry[] {
  if (!Array.isArray(entries)) return []

  return entries
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry, index) =>
      normalizeSacrificePoolEntry(entry as Partial<SacrificePoolEntry>, index)
    )
}

function sanitizeJournalData(body: unknown): TradeJournalData {
  if (!body || typeof body !== 'object') {
    return { entries: [], monthlyProfitEntries: [], sacrificePoolEntries: [] }
  }

  const data = body as {
    entries?: unknown
    monthlyProfitEntries?: unknown
    sacrificePoolEntries?: unknown
  }
  return {
    entries: sanitizeEntries(data.entries),
    monthlyProfitEntries: sanitizeMonthlyProfitEntries(data.monthlyProfitEntries),
    sacrificePoolEntries: sanitizeSacrificePoolEntries(data.sacrificePoolEntries),
  }
}

export async function GET(request: NextRequest) {
  const idToken = extractIdToken(request)
  if (!idToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = getUserIdFromToken(idToken)
  if (!userId) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  try {
    const result = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { userId },
      })
    )

    return NextResponse.json({
      entries: sanitizeEntries(result.Item?.entries),
      monthlyProfitEntries: sanitizeMonthlyProfitEntries(result.Item?.monthlyProfitEntries),
      sacrificePoolEntries: sanitizeSacrificePoolEntries(result.Item?.sacrificePoolEntries),
      updatedAt: result.Item?.updatedAt ?? null,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load trade journal'
    console.error('Trade journal GET error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const idToken = extractIdToken(request)
  if (!idToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = getUserIdFromToken(idToken)
  if (!userId) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const journal = sanitizeJournalData(body)
    const now = new Date().toISOString()

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          userId,
          entries: journal.entries,
          monthlyProfitEntries: journal.monthlyProfitEntries,
          sacrificePoolEntries: journal.sacrificePoolEntries,
          updatedAt: now,
        },
      })
    )

    return NextResponse.json({ success: true, updatedAt: now })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to save trade journal'
    console.error('Trade journal PUT error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
