import { NextRequest, NextResponse } from 'next/server'
import { initInventoryTables, getDbClient } from '@/lib/db'

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await initInventoryTables()
  const db = getDbClient()
  await db.execute('DELETE FROM inv_movements WHERE id = ?', [params.id])
  return NextResponse.json({ success: true })
}
