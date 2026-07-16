export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { initInventoryTables, getDbClient } from '@/lib/db'
import { requirePermission } from '@/lib/session'

export async function GET() {
  const _auth = await requirePermission('inventory', 'view')
  if ('error' in _auth) return _auth.error
  await initInventoryTables()
  const db = getDbClient()
  const result = await db.execute('SELECT * FROM inv_suppliers ORDER BY name')
  return NextResponse.json(result.rows)
}

export async function POST(req: NextRequest) {
  const _auth = await requirePermission('inventory', 'create')
  if ('error' in _auth) return _auth.error
  await initInventoryTables()
  const db = getDbClient()
  const body = await req.json()
  const id = crypto.randomUUID()
  await db.execute(
    `INSERT INTO inv_suppliers (id, name, contact_name, email, phone, city, address, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, body.name ?? '', body.contact_name ?? null, body.email ?? null, body.phone ?? null, body.city ?? null, body.address ?? null, body.notes ?? null],
  )
  const result = await db.execute('SELECT * FROM inv_suppliers WHERE id = ?', [id])
  return NextResponse.json(result.rows[0], { status: 201 })
}
