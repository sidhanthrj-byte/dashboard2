export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { initInventoryTables, getDbClient } from '@/lib/db'
import { requirePermission } from '@/lib/session'

export async function GET() {
  const _auth = await requirePermission('inventory', 'view')
  if ('error' in _auth) return _auth.error
  await initInventoryTables()
  const db = getDbClient()
  const result = await db.execute('SELECT * FROM inv_work_completions ORDER BY completion_date DESC')
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
    `INSERT INTO inv_work_completions (id, project_name, client_name, location, completion_date, status, amount, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, body.project_name ?? '', body.client_name ?? null, body.location ?? null, body.completion_date ?? null, body.status ?? 'completed', Number(body.amount ?? 0), body.notes ?? null],
  )
  const result = await db.execute('SELECT * FROM inv_work_completions WHERE id = ?', [id])
  return NextResponse.json(result.rows[0], { status: 201 })
}
