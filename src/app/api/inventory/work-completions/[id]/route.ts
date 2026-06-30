import { NextRequest, NextResponse } from 'next/server'
import { initInventoryTables, getDbClient } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  await initInventoryTables()
  const db = getDbClient()
  const result = await db.execute('SELECT * FROM inv_work_completions WHERE id = ?', [params.id])
  if (!result.rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(result.rows[0])
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  await initInventoryTables()
  const db = getDbClient()
  const body = await req.json()
  await db.execute(
    'UPDATE inv_work_completions SET project_name=?, client_name=?, location=?, completion_date=?, status=?, amount=?, notes=? WHERE id=?',
    [body.project_name ?? '', body.client_name ?? null, body.location ?? null, body.completion_date ?? null, body.status ?? 'completed', Number(body.amount ?? 0), body.notes ?? null, params.id],
  )
  const result = await db.execute('SELECT * FROM inv_work_completions WHERE id = ?', [params.id])
  return NextResponse.json(result.rows[0])
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await initInventoryTables()
  const db = getDbClient()
  await db.execute('DELETE FROM inv_work_completions WHERE id = ?', [params.id])
  return NextResponse.json({ success: true })
}
