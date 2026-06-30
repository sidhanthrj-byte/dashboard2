export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { initClientsTable, getDbClient } from '@/lib/db'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  await initClientsTable()
  const db = getDbClient()
  const c = await db.execute('SELECT * FROM clients WHERE id = ?', [params.id])
  if (!c.rows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const quotes = await db.execute('SELECT id, quote_number, project_name, date, grand_total, status FROM pongs_quotes WHERE client_name = (SELECT name FROM clients WHERE id = ?) ORDER BY created_at DESC', [params.id])
  const projects = await db.execute('SELECT id, name, status, scheduled_date, ceiling_area_sqft, contract_value FROM projects WHERE client_name = (SELECT name FROM clients WHERE id = ?) ORDER BY scheduled_date DESC', [params.id])
  return NextResponse.json({ ...c.rows[0], quotes: quotes.rows, projects: projects.rows })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  await initClientsTable()
  const db = getDbClient()
  const b = await req.json()
  const now = new Date().toISOString()
  await db.execute(
    `UPDATE clients SET name=?,company=?,email=?,phone=?,city=?,address=?,gst_number=?,source=?,status=?,notes=?,updated_at=? WHERE id=?`,
    [b.name, b.company??null, b.email??null, b.phone??null, b.city??null, b.address??null, b.gst_number??null, b.source??'direct', b.status??'active', b.notes??null, now, params.id]
  )
  const r = await db.execute('SELECT * FROM clients WHERE id = ?', [params.id])
  return NextResponse.json(r.rows[0])
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await initClientsTable()
  const db = getDbClient()
  await db.execute('DELETE FROM clients WHERE id = ?', [params.id])
  return NextResponse.json({ ok: true })
}
