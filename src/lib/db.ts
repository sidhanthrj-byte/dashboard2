import { createClient, type InValue } from '@libsql/client'
import type { Quote } from './types'

let _client: ReturnType<typeof createClient> | null = null

function getClient() {
  if (!_client) {
    const url = process.env.TURSO_URL
    const authToken = process.env.TURSO_AUTH_TOKEN
    if (!url) throw new Error('TURSO_URL env var not set')
    _client = createClient({ url, authToken })
  }
  return _client
}

export async function initQuotesTable() {
  const db = getClient()
  await db.execute(`
    CREATE TABLE IF NOT EXISTS pongs_quotes (
      id TEXT PRIMARY KEY,
      quote_number TEXT NOT NULL,
      client_name TEXT NOT NULL,
      project_name TEXT,
      location TEXT,
      date TEXT NOT NULL,
      valid_until TEXT,
      price_tier TEXT NOT NULL DEFAULT 'msp',
      markup_percent REAL DEFAULT 0,
      installation_rate REAL DEFAULT 120,
      transport_cost REAL DEFAULT 0,
      include_gst INTEGER DEFAULT 0,
      display_mode TEXT DEFAULT 'total',
      items_json TEXT NOT NULL DEFAULT '[]',
      notes TEXT,
      grand_total REAL DEFAULT 0,
      client_email TEXT,
      client_phone TEXT,
      status TEXT DEFAULT 'draft',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `)
  // Migrate: add status column if it doesn't exist yet
  try {
    await db.execute(`ALTER TABLE pongs_quotes ADD COLUMN status TEXT DEFAULT 'draft'`)
  } catch {
    // Column already exists — ignore
  }
  // Migrate: bump any quotes still using the old ₹60 default to ₹120
  await db.execute(`UPDATE pongs_quotes SET installation_rate = 120 WHERE installation_rate = 60`)
}

export async function dbListQuotes(): Promise<Quote[]> {
  await initQuotesTable()
  const db = getClient()
  const result = await db.execute('SELECT * FROM pongs_quotes ORDER BY created_at DESC')
  return result.rows.map(rowToQuote) as unknown as Quote[]
}

export async function dbGetQuote(id: string): Promise<Quote | null> {
  await initQuotesTable()
  const db = getClient()
  const result = await db.execute(
    'SELECT * FROM pongs_quotes WHERE id = ?',
    [id],
  )
  if (!result.rows.length) return null
  return rowToQuote(result.rows[0]) as unknown as Quote
}

export async function dbSaveQuote(quote: Record<string, unknown>) {
  await initQuotesTable()
  const db = getClient()
  const now = new Date().toISOString()
  const args: InValue[] = [
    String(quote.id ?? ''),
    String(quote.quoteNumber ?? ''),
    String(quote.clientName ?? ''),
    (quote.projectName as string) ?? null,
    (quote.location as string) ?? null,
    String(quote.date ?? now),
    (quote.validUntil as string) ?? null,
    String(quote.priceTier ?? 'msp'),
    Number(quote.markupPercent ?? 0),
    Number(quote.installationRatePerSqft ?? quote.installationRate ?? 120),
    Number(quote.transportCost ?? 0),
    quote.includeGst ? 1 : 0,
    String(quote.displayMode ?? 'total'),
    JSON.stringify(quote.items ?? []),
    (quote.notes as string) ?? null,
    Number(quote.grandTotal ?? 0),
    (quote.clientEmail as string) ?? null,
    (quote.clientPhone as string) ?? null,
    String((quote.status as string) ?? 'draft'),
    String(quote.createdAt ?? now),
    now,
  ]
  await db.execute(
    `INSERT INTO pongs_quotes (id, quote_number, client_name, project_name, location, date, valid_until,
      price_tier, markup_percent, installation_rate, transport_cost, include_gst, display_mode,
      items_json, notes, grand_total, client_email, client_phone, status, created_at, updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET
        client_name=excluded.client_name, project_name=excluded.project_name,
        location=excluded.location, date=excluded.date, valid_until=excluded.valid_until,
        price_tier=excluded.price_tier, markup_percent=excluded.markup_percent,
        installation_rate=excluded.installation_rate, transport_cost=excluded.transport_cost,
        include_gst=excluded.include_gst, display_mode=excluded.display_mode,
        items_json=excluded.items_json, notes=excluded.notes, grand_total=excluded.grand_total,
        client_email=excluded.client_email, client_phone=excluded.client_phone,
        status=excluded.status, updated_at=excluded.updated_at`,
    args,
  )
}

export async function dbDeleteQuote(id: string) {
  await initQuotesTable()
  const db = getClient()
  await db.execute('DELETE FROM pongs_quotes WHERE id = ?', [id])
}

export async function dbNextQuoteNumber() {
  await initQuotesTable()
  const db = getClient()
  const result = await db.execute('SELECT quote_number FROM pongs_quotes ORDER BY created_at DESC')
  let max = 0
  for (const row of result.rows) {
    const n = parseInt(String(row.quote_number).replace(/\D/g, '') || '0', 10)
    if (n > max) max = n
  }
  return `Q-${String(max + 1).padStart(4, '0')}`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToQuote(row: any): Record<string, unknown> {
  return {
    id: row.id,
    quoteNumber: row.quote_number,
    clientName: row.client_name,
    projectName: row.project_name,
    location: row.location,
    date: row.date,
    validUntil: row.valid_until,
    priceTier: row.price_tier,
    markupPercent: row.markup_percent,
    installationRatePerSqft: row.installation_rate,
    transportCost: row.transport_cost,
    includeGst: !!row.include_gst,
    displayMode: row.display_mode ?? 'total',
    items: JSON.parse(row.items_json ?? '[]'),
    notes: row.notes,
    grandTotal: row.grand_total,
    clientEmail: row.client_email,
    clientPhone: row.client_phone,
    status: row.status ?? 'draft',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
