import { NextRequest, NextResponse } from 'next/server'
import { initInventoryTables, getDbClient } from '@/lib/db'

export async function GET(req: NextRequest) {
  await initInventoryTables()
  const db = getDbClient()
  const { searchParams } = req.nextUrl
  const city = searchParams.get('city')
  const status = searchParams.get('status')
  const access_level = searchParams.get('access_level')

  let sql = 'SELECT * FROM app_users WHERE 1=1'
  const args: string[] = []
  if (city) { sql += ' AND city = ?'; args.push(city) }
  if (status) { sql += ' AND status = ?'; args.push(status) }
  if (access_level) { sql += ' AND access_level = ?'; args.push(access_level) }
  sql += ' ORDER BY name'

  const result = args.length ? await db.execute(sql, args) : await db.execute(sql)
  return NextResponse.json(result.rows)
}

export async function POST(req: NextRequest) {
  await initInventoryTables()
  const db = getDbClient()
  const body = await req.json()
  const id = crypto.randomUUID()
  const bases = Array.isArray(body.bases) ? JSON.stringify(body.bases) : (body.bases ?? '[]')
  await db.execute(
    `INSERT INTO app_users (id, name, email, city, access_level, bases, status, phone, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, body.name ?? '', body.email ?? null, body.city ?? null, body.access_level ?? 'editor', bases, body.status ?? 'active', body.phone ?? null, body.notes ?? null],
  )
  const result = await db.execute('SELECT * FROM app_users WHERE id = ?', [id])
  return NextResponse.json(result.rows[0], { status: 201 })
}
