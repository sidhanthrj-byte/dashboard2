export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { initClientsTable, getDbClient } from '@/lib/db'

export async function GET(req: NextRequest) {
  await initClientsTable()
  const db = getDbClient()
  const q = req.nextUrl.searchParams.get('q') ?? ''
  const sql = q
    ? `SELECT c.*, (SELECT COUNT(*) FROM pongs_quotes WHERE client_name = c.name) as quote_count,
        (SELECT COALESCE(SUM(grand_total),0) FROM pongs_quotes WHERE client_name = c.name) as total_value
       FROM clients c WHERE c.name LIKE ? OR c.company LIKE ? OR c.city LIKE ? ORDER BY c.name`
    : `SELECT c.*, (SELECT COUNT(*) FROM pongs_quotes WHERE client_name = c.name) as quote_count,
        (SELECT COALESCE(SUM(grand_total),0) FROM pongs_quotes WHERE client_name = c.name) as total_value
       FROM clients c ORDER BY c.name`
  const result = q ? await db.execute(sql, [`%${q}%`, `%${q}%`, `%${q}%`]) : await db.execute(sql)
  return NextResponse.json(result.rows)
}

export async function POST(req: NextRequest) {
  await initClientsTable()
  const db = getDbClient()
  const b = await req.json()
  if (!b.name) return NextResponse.json({ error: 'Name required' }, { status: 400 })
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  await db.execute(
    `INSERT INTO clients (id,name,company,email,phone,city,address,gst_number,source,status,notes,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, b.name, b.company??null, b.email??null, b.phone??null, b.city??null, b.address??null, b.gst_number??null, b.source??'direct', b.status??'active', b.notes??null, now, now]
  )
  const r = await db.execute('SELECT * FROM clients WHERE id = ?', [id])
  return NextResponse.json(r.rows[0], { status: 201 })
}
