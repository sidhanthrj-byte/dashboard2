import { NextRequest, NextResponse } from 'next/server'
import { initInventoryTables, getDbClient } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  await initInventoryTables()
  const db = getDbClient()
  const result = await db.execute('SELECT * FROM inv_purchases WHERE id = ?', [params.id])
  if (!result.rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const items = await db.execute('SELECT * FROM inv_purchase_items WHERE purchase_id = ?', [params.id])
  return NextResponse.json({ ...result.rows[0], items: items.rows })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  await initInventoryTables()
  const db = getDbClient()
  const body = await req.json()
  await db.execute(
    'UPDATE inv_purchases SET purchase_number=?, supplier_id=?, supplier_name=?, purchase_date=?, total_amount=?, status=?, notes=? WHERE id=?',
    [body.purchase_number ?? '', body.supplier_id ?? null, body.supplier_name ?? null, body.purchase_date ?? '', Number(body.total_amount ?? 0), body.status ?? 'received', body.notes ?? null, params.id],
  )
  const result = await db.execute('SELECT * FROM inv_purchases WHERE id = ?', [params.id])
  const items = await db.execute('SELECT * FROM inv_purchase_items WHERE purchase_id = ?', [params.id])
  return NextResponse.json({ ...result.rows[0], items: items.rows })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await initInventoryTables()
  const db = getDbClient()
  await db.execute('DELETE FROM inv_purchase_items WHERE purchase_id = ?', [params.id])
  await db.execute('DELETE FROM inv_purchases WHERE id = ?', [params.id])
  return NextResponse.json({ success: true })
}
