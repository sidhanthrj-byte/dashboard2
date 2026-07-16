export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { initProjectsTables, getDbClient } from '@/lib/db'
import { requirePermission } from '@/lib/session'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePermission('projects', 'view')
  if ('error' in auth) return auth.error
  await initProjectsTables()
  const db = getDbClient()
  const p = await db.execute('SELECT * FROM projects WHERE id = ?', [params.id])
  const mats = await db.execute('SELECT * FROM project_materials WHERE project_id = ?', [params.id])
  const updates = await db.execute('SELECT * FROM project_updates WHERE project_id = ? ORDER BY created_at DESC', [params.id])
  if (!p.rows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ ...p.rows[0], materials: mats.rows, updates: updates.rows })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePermission('projects', 'edit')
  if ('error' in auth) return auth.error
  await initProjectsTables()
  const db = getDbClient()
  const b = await req.json()
  const now = new Date().toISOString()
  await db.execute(
    `UPDATE projects SET name=?,client_name=?,client_phone=?,client_email=?,site_address=?,city=?,status=?,scheduled_date=?,completion_date=?,team_lead=?,team_members=?,ceiling_area_sqft=?,contract_value=?,priority=?,notes=?,updated_at=? WHERE id=?`,
    [b.name,b.client_name,b.client_phone??null,b.client_email??null,b.site_address??null,b.city??null,b.status??'scheduled',b.scheduled_date??null,b.completion_date??null,b.team_lead??null,JSON.stringify(b.team_members??[]),Number(b.ceiling_area_sqft??0),Number(b.contract_value??0),b.priority??'normal',b.notes??null,now,params.id]
  )
  const r = await db.execute('SELECT * FROM projects WHERE id = ?', [params.id])
  return NextResponse.json(r.rows[0])
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePermission('projects', 'delete')
  if ('error' in auth) return auth.error
  await initProjectsTables()
  const db = getDbClient()
  await db.execute('DELETE FROM project_materials WHERE project_id = ?', [params.id])
  await db.execute('DELETE FROM project_updates WHERE project_id = ?', [params.id])
  await db.execute('DELETE FROM projects WHERE id = ?', [params.id])
  return NextResponse.json({ ok: true })
}
