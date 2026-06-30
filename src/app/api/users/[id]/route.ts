import { NextRequest, NextResponse } from 'next/server'
import { initInventoryTables, getDbClient } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  await initInventoryTables()
  const db = getDbClient()
  const result = await db.execute('SELECT * FROM app_users WHERE id = ?', [params.id])
  if (!result.rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(result.rows[0])
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  await initInventoryTables()
  const db = getDbClient()
  const body = await req.json()
  const bases = Array.isArray(body.bases) ? JSON.stringify(body.bases) : (body.bases ?? '[]')
  await db.execute(
    'UPDATE app_users SET name=?, email=?, city=?, access_level=?, bases=?, status=?, phone=?, notes=? WHERE id=?',
    [body.name ?? '', body.email ?? null, body.city ?? null, body.access_level ?? 'editor', bases, body.status ?? 'active', body.phone ?? null, body.notes ?? null, params.id],
  )
  const result = await db.execute('SELECT * FROM app_users WHERE id = ?', [params.id])
  return NextResponse.json(result.rows[0])
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await initInventoryTables()
  const db = getDbClient()
  await db.execute('DELETE FROM app_users WHERE id = ?', [params.id])
  return NextResponse.json({ success: true })
}
