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
  } catch { /* already exists */ }
  try {
    await db.execute(`ALTER TABLE pongs_quotes ADD COLUMN manual_rates_json TEXT`)
  } catch { /* already exists */ }
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
    quote.manualRates ? JSON.stringify(quote.manualRates) : null,
  ]
  await db.execute(
    `INSERT INTO pongs_quotes (id, quote_number, client_name, project_name, location, date, valid_until,
      price_tier, markup_percent, installation_rate, transport_cost, include_gst, display_mode,
      items_json, notes, grand_total, client_email, client_phone, status, created_at, updated_at, manual_rates_json)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET
        client_name=excluded.client_name, project_name=excluded.project_name,
        location=excluded.location, date=excluded.date, valid_until=excluded.valid_until,
        price_tier=excluded.price_tier, markup_percent=excluded.markup_percent,
        installation_rate=excluded.installation_rate, transport_cost=excluded.transport_cost,
        include_gst=excluded.include_gst, display_mode=excluded.display_mode,
        items_json=excluded.items_json, notes=excluded.notes, grand_total=excluded.grand_total,
        client_email=excluded.client_email, client_phone=excluded.client_phone,
        status=excluded.status, updated_at=excluded.updated_at,
        manual_rates_json=excluded.manual_rates_json`,
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

export function getDbClient() {
  return getClient()
}

export async function initInventoryTables() {
  const db = getClient()
  const tables = [
    `CREATE TABLE IF NOT EXISTS inv_products (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT, sku TEXT, unit TEXT DEFAULT 'nos',
      current_stock REAL DEFAULT 0, min_stock REAL DEFAULT 0,
      cost_price REAL DEFAULT 0, sell_price REAL DEFAULT 0,
      supplier_id TEXT, notes TEXT,
      created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS inv_suppliers (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, contact_name TEXT,
      email TEXT, phone TEXT, city TEXT, address TEXT, notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS inv_purchases (
      id TEXT PRIMARY KEY, purchase_number TEXT NOT NULL,
      supplier_id TEXT, supplier_name TEXT,
      purchase_date TEXT NOT NULL, total_amount REAL DEFAULT 0,
      status TEXT DEFAULT 'received', notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS inv_purchase_items (
      id TEXT PRIMARY KEY, purchase_id TEXT NOT NULL,
      product_id TEXT, description TEXT, category TEXT,
      quantity REAL DEFAULT 0, unit TEXT DEFAULT 'nos',
      unit_price REAL DEFAULT 0, total_price REAL DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS inv_movements (
      id TEXT PRIMARY KEY, product_id TEXT, product_name TEXT,
      movement_type TEXT NOT NULL, quantity REAL NOT NULL,
      reference_type TEXT, reference_id TEXT, notes TEXT,
      movement_date TEXT DEFAULT (datetime('now')),
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS inv_work_completions (
      id TEXT PRIMARY KEY, project_name TEXT NOT NULL,
      client_name TEXT, location TEXT, completion_date TEXT,
      status TEXT DEFAULT 'completed', amount REAL DEFAULT 0,
      notes TEXT, created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS app_users (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT,
      city TEXT, access_level TEXT DEFAULT 'editor',
      bases TEXT DEFAULT '[]', status TEXT DEFAULT 'active',
      phone TEXT, notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
  ]
  for (const sql of tables) {
    await db.execute(sql)
  }
}

// ===========================================================================
// PROJECTS / JOBS MODULE
// ===========================================================================

// initProjectsTables is defined further below (canonical version).

export interface ProjectFilters {
  status?: string | null
  month?: string | null
  priority?: string | null
}

export async function dbListProjects(filters: ProjectFilters = {}) {
  await initProjectsTables()
  const db = getClient()
  let sql = 'SELECT * FROM projects WHERE 1=1'
  const args: InValue[] = []
  if (filters.status) { sql += ' AND status = ?'; args.push(filters.status) }
  if (filters.priority) { sql += ' AND priority = ?'; args.push(filters.priority) }
  if (filters.month) { sql += " AND substr(scheduled_date,1,7) = ?"; args.push(filters.month) }
  sql += ' ORDER BY scheduled_date ASC, created_at DESC'
  const result = args.length ? await db.execute(sql, args) : await db.execute(sql)
  return result.rows
}

export async function dbGetProject(id: string) {
  await initProjectsTables()
  const db = getClient()
  const proj = await db.execute('SELECT * FROM projects WHERE id = ?', [id])
  if (!proj.rows.length) return null
  const materials = await db.execute('SELECT * FROM project_materials WHERE project_id = ?', [id])
  const updates = await db.execute('SELECT * FROM project_updates WHERE project_id = ? ORDER BY created_at DESC', [id])
  return { ...proj.rows[0], materials: materials.rows, updates: updates.rows }
}

function projectArgs(body: Record<string, unknown>): InValue[] {
  const tm = Array.isArray(body.team_members) ? JSON.stringify(body.team_members) : ((body.team_members as string) ?? '[]')
  return [
    body.name as string ?? '',
    body.client_name as string ?? '',
    (body.client_phone as string) ?? null,
    (body.client_email as string) ?? null,
    body.site_address as string ?? '',
    (body.city as string) ?? null,
    (body.quote_id as string) ?? null,
    (body.status as string) ?? 'scheduled',
    (body.scheduled_date as string) ?? null,
    (body.completion_date as string) ?? null,
    (body.team_lead as string) ?? null,
    tm,
    Number(body.ceiling_area_sqft ?? 0),
    Number(body.contract_value ?? 0),
    (body.notes as string) ?? null,
    (body.priority as string) ?? 'normal',
  ]
}

export async function dbCreateProject(body: Record<string, unknown>) {
  await initProjectsTables()
  const db = getClient()
  const id = (body.id as string) || crypto.randomUUID()
  await db.execute(
    `INSERT INTO projects (id, name, client_name, client_phone, client_email, site_address, city,
      quote_id, status, scheduled_date, completion_date, team_lead, team_members,
      ceiling_area_sqft, contract_value, notes, priority)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, ...projectArgs(body)],
  )
  const r = await db.execute('SELECT * FROM projects WHERE id = ?', [id])
  return r.rows[0]
}

export async function dbUpdateProject(id: string, body: Record<string, unknown>) {
  await initProjectsTables()
  const db = getClient()
  await db.execute(
    `UPDATE projects SET name=?, client_name=?, client_phone=?, client_email=?, site_address=?, city=?,
      quote_id=?, status=?, scheduled_date=?, completion_date=?, team_lead=?, team_members=?,
      ceiling_area_sqft=?, contract_value=?, notes=?, priority=?, updated_at=datetime('now') WHERE id=?`,
    [...projectArgs(body), id],
  )
  const r = await db.execute('SELECT * FROM projects WHERE id = ?', [id])
  return r.rows[0]
}

export async function dbDeleteProject(id: string) {
  await initProjectsTables()
  const db = getClient()
  await db.execute('DELETE FROM projects WHERE id = ?', [id])
  await db.execute('DELETE FROM project_materials WHERE project_id = ?', [id])
  await db.execute('DELETE FROM project_updates WHERE project_id = ?', [id])
}

export async function dbAddProjectUpdate(projectId: string, body: Record<string, unknown>) {
  await initProjectsTables()
  const db = getClient()
  const id = crypto.randomUUID()
  await db.execute(
    `INSERT INTO project_updates (id, project_id, note, status, created_by) VALUES (?,?,?,?,?)`,
    [id, projectId, (body.note as string) ?? '', (body.status as string) ?? null, (body.created_by as string) ?? null],
  )
  if (body.status) {
    await db.execute(`UPDATE projects SET status=?, updated_at=datetime('now') WHERE id=?`, [body.status as string, projectId])
  }
  const r = await db.execute('SELECT * FROM project_updates WHERE id = ?', [id])
  return r.rows[0]
}

export async function dbListProjectUpdates(projectId: string) {
  await initProjectsTables()
  const db = getClient()
  const r = await db.execute('SELECT * FROM project_updates WHERE project_id = ? ORDER BY created_at DESC', [projectId])
  return r.rows
}

export async function dbProjectStats() {
  await initProjectsTables()
  const db = getClient()
  const r = await db.execute('SELECT * FROM projects')
  const rows = r.rows as unknown as Record<string, unknown>[]
  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  const thisMonth = today.slice(0, 7)
  const weekEnd = new Date(now.getTime() + 7 * 86400000).toISOString().slice(0, 10)

  const byStatus: Record<string, number> = {}
  let totalActive = 0, scheduledThisWeek = 0, completedThisMonth = 0, invoicedThisMonthValue = 0
  let pipelineValue = 0
  const pipelineByStatus: Record<string, number> = {}

  for (const p of rows) {
    const status = String(p.status ?? 'scheduled')
    byStatus[status] = (byStatus[status] ?? 0) + 1
    const sd = String(p.scheduled_date ?? '')
    const cd = String(p.completion_date ?? '')
    const value = Number(p.contract_value ?? 0)
    pipelineByStatus[status] = (pipelineByStatus[status] ?? 0) + value
    if (status !== 'completed' && status !== 'invoiced' && status !== 'cancelled') {
      totalActive++
      pipelineValue += value
    }
    if (sd && sd >= today && sd <= weekEnd) scheduledThisWeek++
    if (status === 'completed' && cd.startsWith(thisMonth)) completedThisMonth++
    if (status === 'invoiced' && (cd.startsWith(thisMonth) || sd.startsWith(thisMonth))) invoicedThisMonthValue += value
  }

  return { byStatus, totalActive, scheduledThisWeek, completedThisMonth, invoicedThisMonthValue, pipelineValue, pipelineByStatus, today, weekEnd }
}

// ===========================================================================
// ANALYTICS
// ===========================================================================

export async function dbQuoteAnalytics() {
  await initQuotesTable()
  const db = getClient()
  const r = await db.execute('SELECT date, grand_total, status, client_name FROM pongs_quotes')
  const rows = r.rows as unknown as Record<string, unknown>[]
  const byMonthMap: Record<string, { count: number; value: number }> = {}
  const statusBreakdown: Record<string, number> = { draft: 0, sent: 0, approved: 0, rejected: 0 }
  for (const q of rows) {
    const month = String(q.date ?? '').slice(0, 7)
    if (month) {
      byMonthMap[month] = byMonthMap[month] ?? { count: 0, value: 0 }
      byMonthMap[month].count++
      byMonthMap[month].value += Number(q.grand_total ?? 0)
    }
    const st = String(q.status ?? 'draft')
    statusBreakdown[st] = (statusBreakdown[st] ?? 0) + 1
  }
  const byMonth = Object.entries(byMonthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, v]) => ({ month, count: v.count, value: v.value }))
  return { byMonth, statusBreakdown }
}

export async function dbTopClients() {
  await initQuotesTable()
  const db = getClient()
  const r = await db.execute('SELECT client_name, grand_total, date FROM pongs_quotes')
  const rows = r.rows as unknown as Record<string, unknown>[]
  const map: Record<string, { count: number; value: number; lastDate: string }> = {}
  for (const q of rows) {
    const name = String(q.client_name ?? 'Unknown')
    map[name] = map[name] ?? { count: 0, value: 0, lastDate: '' }
    map[name].count++
    map[name].value += Number(q.grand_total ?? 0)
    const d = String(q.date ?? '')
    if (d > map[name].lastDate) map[name].lastDate = d
  }
  return Object.entries(map)
    .map(([client, v]) => ({ client, ...v }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)
}

export async function dbInventoryValue() {
  await initInventoryTables()
  const db = getClient()
  const r = await db.execute('SELECT category, current_stock, cost_price FROM inv_products')
  const rows = r.rows as unknown as Record<string, unknown>[]
  const byCategory: Record<string, number> = {}
  let total = 0
  for (const p of rows) {
    const cat = String(p.category ?? 'Uncategorized')
    const val = Number(p.current_stock ?? 0) * Number(p.cost_price ?? 0)
    byCategory[cat] = (byCategory[cat] ?? 0) + val
    total += val
  }
  return { total, byCategory: Object.entries(byCategory).map(([category, value]) => ({ category, value })).sort((a, b) => b.value - a.value) }
}

export async function dbTopConsumedProducts() {
  await initInventoryTables()
  const db = getClient()
  const r = await db.execute("SELECT product_name, quantity FROM inv_movements WHERE movement_type = 'OUT'")
  const rows = r.rows as unknown as Record<string, unknown>[]
  const map: Record<string, number> = {}
  for (const m of rows) {
    const name = String(m.product_name ?? 'Unknown')
    map[name] = (map[name] ?? 0) + Number(m.quantity ?? 0)
  }
  return Object.entries(map).map(([name, qty]) => ({ name, qty })).sort((a, b) => b.qty - a.qty).slice(0, 5)
}

export async function dbLowStockProducts() {
  await initInventoryTables()
  const db = getClient()
  const r = await db.execute('SELECT * FROM inv_products WHERE current_stock <= min_stock AND min_stock > 0 ORDER BY (current_stock - min_stock) ASC')
  return r.rows
}

export async function dbListProducts(category?: string | null) {
  await initInventoryTables()
  const db = getClient()
  const r = category
    ? await db.execute('SELECT * FROM inv_products WHERE category = ? ORDER BY name', [category])
    : await db.execute('SELECT * FROM inv_products ORDER BY name')
  return r.rows
}

export async function dbGetProduct(id: string) {
  await initInventoryTables()
  const db = getClient()
  const p = await db.execute('SELECT * FROM inv_products WHERE id = ?', [id])
  if (!p.rows.length) return null
  const movements = await db.execute('SELECT * FROM inv_movements WHERE product_id = ? ORDER BY movement_date ASC', [id])
  return { ...p.rows[0], movements: movements.rows }
}

export async function dbProjectPipelineStats() {
  return dbProjectStats()
}

// ===========================================================================
// ROLE PERMISSIONS + USER ACTIVITY
// ===========================================================================

// Matrix: each feature has a default per role. We model View + Manage/Edit
// as separate can_view / can_edit flags per (role, feature) pair.
export const PERMISSION_ROLES = ['admin', 'manager', 'sales', 'installer', 'viewer']
export const PERMISSION_FEATURES = ['quotes', 'inventory', 'projects', 'analytics', 'users']
// initPermissionsTables is defined further below (canonical version).

export async function dbListPermissions() {
  await initPermissionsTables()
  const db = getClient()
  const r = await db.execute('SELECT * FROM role_permissions ORDER BY role, feature')
  return r.rows
}

export async function dbLogActivity(userId: string | null, action: string, details?: string) {
  await initPermissionsTables()
  const db = getClient()
  await db.execute(
    'INSERT INTO user_activity_log (id, user_id, action, details) VALUES (?,?,?,?)',
    [crypto.randomUUID(), userId, action, details ?? null],
  )
}

export async function dbListActivity(limit = 100) {
  await initPermissionsTables()
  const db = getClient()
  const r = await db.execute(
    `SELECT a.id, a.user_id, a.action, a.details, a.created_at,
            COALESCE(u.name, a.user_name) as user_name
     FROM user_activity_log a
     LEFT JOIN app_users u ON u.id = a.user_id
     ORDER BY a.created_at DESC LIMIT ?`,
    [limit],
  )
  return r.rows
}

export async function dbListUsers(filters: { city?: string | null; status?: string | null; access_level?: string | null } = {}) {
  await initInventoryTables()
  const db = getClient()
  let sql = 'SELECT * FROM app_users WHERE 1=1'
  const args: InValue[] = []
  if (filters.city) { sql += ' AND city = ?'; args.push(filters.city) }
  if (filters.status) { sql += ' AND status = ?'; args.push(filters.status) }
  if (filters.access_level) { sql += ' AND access_level = ?'; args.push(filters.access_level) }
  sql += ' ORDER BY name'
  const r = args.length ? await db.execute(sql, args) : await db.execute(sql)
  return r.rows
}

export async function dbGetUser(id: string) {
  await initInventoryTables()
  const db = getClient()
  const r = await db.execute('SELECT * FROM app_users WHERE id = ?', [id])
  return r.rows[0] ?? null
}

// ===========================================================================
// NOTIFICATIONS
// ===========================================================================

export async function dbNotificationCounts() {
  await initInventoryTables()
  await initProjectsTables()
  const db = getClient()
  const lowStock = await db.execute('SELECT id, name, current_stock, min_stock FROM inv_products WHERE current_stock <= min_stock AND min_stock > 0')
  const today = new Date().toISOString().slice(0, 10)
  const todayJobs = await db.execute('SELECT id, name, client_name, team_lead FROM projects WHERE scheduled_date = ?', [today])
  return {
    lowStockCount: lowStock.rows.length,
    todayJobsCount: todayJobs.rows.length,
    lowStock: lowStock.rows,
    todayJobs: todayJobs.rows,
    total: lowStock.rows.length + todayJobs.rows.length,
  }
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
    manualRates: row.manual_rates_json ? JSON.parse(row.manual_rates_json as string) : undefined,
  }
}

let _projectsInit = false
export async function initProjectsTables() {
  if (_projectsInit) return
  const db = getClient()
  await db.execute(`CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, client_name TEXT NOT NULL,
    client_phone TEXT, client_email TEXT, site_address TEXT, city TEXT,
    quote_id TEXT, status TEXT DEFAULT 'scheduled',
    scheduled_date TEXT, completion_date TEXT,
    team_lead TEXT, team_members TEXT DEFAULT '[]',
    ceiling_area_sqft REAL DEFAULT 0, contract_value REAL DEFAULT 0,
    priority TEXT DEFAULT 'normal', notes TEXT,
    created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
  )`)
  await db.execute(`CREATE TABLE IF NOT EXISTS project_materials (
    id TEXT PRIMARY KEY, project_id TEXT NOT NULL,
    product_id TEXT, description TEXT NOT NULL,
    qty REAL NOT NULL, unit TEXT DEFAULT 'pcs', notes TEXT
  )`)
  await db.execute(`CREATE TABLE IF NOT EXISTS project_updates (
    id TEXT PRIMARY KEY, project_id TEXT NOT NULL,
    note TEXT NOT NULL, status TEXT, created_by TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`)
  _projectsInit = true
}

const DEFAULT_PERMISSIONS = [
  { feature: 'quotes',     view: { admin:1, manager:1, sales:1, installer:0, viewer:1 }, edit: { admin:1, manager:1, sales:1, installer:0, viewer:0 } },
  { feature: 'inventory',  view: { admin:1, manager:1, sales:0, installer:0, viewer:0 }, edit: { admin:1, manager:1, sales:0, installer:0, viewer:0 } },
  { feature: 'projects',   view: { admin:1, manager:1, sales:1, installer:1, viewer:1 }, edit: { admin:1, manager:1, sales:0, installer:1, viewer:0 } },
  { feature: 'analytics',  view: { admin:1, manager:1, sales:0, installer:0, viewer:0 }, edit: { admin:1, manager:1, sales:0, installer:0, viewer:0 } },
  { feature: 'users',      view: { admin:1, manager:1, sales:0, installer:0, viewer:0 }, edit: { admin:1, manager:0, sales:0, installer:0, viewer:0 } },
]

let _permInit = false
export async function initPermissionsTables() {
  if (_permInit) return
  const db = getClient()
  await db.execute(`CREATE TABLE IF NOT EXISTS role_permissions (
    id TEXT PRIMARY KEY, role TEXT NOT NULL, feature TEXT NOT NULL,
    can_view INTEGER DEFAULT 0, can_edit INTEGER DEFAULT 0,
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(role, feature)
  )`)
  await db.execute(`CREATE TABLE IF NOT EXISTS user_activity_log (
    id TEXT PRIMARY KEY, user_id TEXT, action TEXT NOT NULL,
    details TEXT, created_at TEXT DEFAULT (datetime('now'))
  )`)
  const existing = await db.execute('SELECT COUNT(*) as c FROM role_permissions')
  if (Number((existing.rows[0] as Record<string,unknown>).c) === 0) {
    for (const { feature, view, edit } of DEFAULT_PERMISSIONS) {
      for (const role of ['admin','manager','sales','installer','viewer']) {
        await db.execute(
          'INSERT INTO role_permissions (id, role, feature, can_view, can_edit) VALUES (?,?,?,?,?)',
          [crypto.randomUUID(), role, feature, (view as Record<string,number>)[role]??0, (edit as Record<string,number>)[role]??0]
        )
      }
    }
  }
  _permInit = true
}
