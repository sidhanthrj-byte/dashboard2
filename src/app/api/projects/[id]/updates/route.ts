export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { initProjectsTables, getDbClient } from '@/lib/db'
import { requirePermission } from '@/lib/session'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const _auth = await requirePermission('projects', 'edit')
  if ('error' in _auth) return _auth.error
  await initProjectsTables()
  const db = getDbClient()
  const b = await req.json()
  const id = crypto.randomUUID()
  await db.execute(
    'INSERT INTO project_updates (id,project_id,note,status,created_by) VALUES (?,?,?,?,?)',
    [id, params.id, b.note ?? '', b.status ?? null, b.created_by ?? null]
  )
  if (b.status) {
    await db.execute('UPDATE projects SET status=?,updated_at=? WHERE id=?', [b.status, new Date().toISOString(), params.id])
  }
  const r = await db.execute('SELECT * FROM project_updates WHERE id = ?', [id])
  return NextResponse.json(r.rows[0], { status: 201 })
}
