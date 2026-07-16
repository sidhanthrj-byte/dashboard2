export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { initPaymentsTable, dbSeedProjectChecklist, getDbClient } from '@/lib/db'
import { requirePermission } from '@/lib/session'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const _auth = await requirePermission('projects', 'view')
  if ('error' in _auth) return _auth.error
  await initPaymentsTable()
  await dbSeedProjectChecklist(params.id)
  const db = getDbClient()
  const r = await db.execute('SELECT * FROM project_checklists WHERE project_id = ? ORDER BY phase, sort_order', [params.id])
  return NextResponse.json(r.rows)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const _auth = await requirePermission('projects', 'edit')
  if ('error' in _auth) return _auth.error
  await initPaymentsTable()
  const db = getDbClient()
  const { item_id, done, done_by } = await req.json()
  const now = new Date().toISOString()
  await db.execute(
    'UPDATE project_checklists SET done=?, done_by=?, done_at=? WHERE id=? AND project_id=?',
    [done ? 1 : 0, done ? (done_by ?? null) : null, done ? now : null, item_id, params.id]
  )
  return NextResponse.json({ ok: true })
}
