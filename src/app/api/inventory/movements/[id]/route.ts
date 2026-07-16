export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { initInventoryTables, getDbClient } from '@/lib/db'
import { requirePermission } from '@/lib/session'

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const _auth = await requirePermission('inventory', 'delete')
  if ('error' in _auth) return _auth.error
  await initInventoryTables()
  const db = getDbClient()
  await db.execute('DELETE FROM inv_movements WHERE id = ?', [params.id])
  return NextResponse.json({ success: true })
}
