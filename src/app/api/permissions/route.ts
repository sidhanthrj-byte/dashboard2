export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { initPermissionsTables, getDbClient } from '@/lib/db'

export async function GET() {
  await initPermissionsTables()
  const db = getDbClient()
  const r = await db.execute('SELECT * FROM role_permissions ORDER BY role, feature')
  return NextResponse.json(r.rows)
}

export async function PUT(req: NextRequest) {
  await initPermissionsTables()
  const db = getDbClient()
  const updates: { role: string; feature: string; can_view: number; can_edit: number }[] = await req.json()
  for (const u of updates) {
    await db.execute(
      `INSERT INTO role_permissions (id,role,feature,can_view,can_edit,updated_at) VALUES (?,?,?,?,?,datetime('now'))
       ON CONFLICT(role,feature) DO UPDATE SET can_view=excluded.can_view, can_edit=excluded.can_edit, updated_at=excluded.updated_at`,
      [crypto.randomUUID(), u.role, u.feature, u.can_view, u.can_edit]
    )
  }
  return NextResponse.json({ ok: true })
}
