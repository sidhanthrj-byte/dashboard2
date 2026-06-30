import { NextRequest, NextResponse } from 'next/server'
import { initInventoryTables, getDbClient } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  await initInventoryTables()
  const db = getDbClient()
  const result = await db.execute('SELECT * FROM inv_suppliers WHERE id = ?', [params.id])
  if (!result.rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(result.rows[0])
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  await initInventoryTables()
  const db = getDbClient()
  const body = await req.json()
  await db.execute(
    'UPDATE inv_suppliers SET name=?, contact_name=?, email=?, phone=?, city=?, address=?, notes=? WHERE id=?',
    [body.name ?? '', body.contact_name ?? null, body.email ?? null, body.phone ?? null, body.city ?? null, body.address ?? null, body.notes ?? null, params.id],
  )
  const result = await db.execute('SELECT * FROM inv_suppliers WHERE id = ?', [params.id])
  return NextResponse.json(result.rows[0])
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await initInventoryTables()
  const db = getDbClient()
  await db.execute('DELETE FROM inv_suppliers WHERE id = ?', [params.id])
  return NextResponse.json({ success: true })
}
