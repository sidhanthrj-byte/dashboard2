import { NextRequest, NextResponse } from 'next/server'
import { initInventoryTables, getDbClient } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  await initInventoryTables()
  const db = getDbClient()
  const result = await db.execute('SELECT * FROM inv_products WHERE id = ?', [params.id])
  if (!result.rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(result.rows[0])
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  await initInventoryTables()
  const db = getDbClient()
  const body = await req.json()
  await db.execute(
    `UPDATE inv_products SET name=?, category=?, sku=?, unit=?, current_stock=?, min_stock=?,
     cost_price=?, sell_price=?, supplier_id=?, notes=?, updated_at=datetime('now') WHERE id=?`,
    [
      body.name ?? '',
      body.category ?? null,
      body.sku ?? null,
      body.unit ?? 'nos',
      Number(body.current_stock ?? 0),
      Number(body.min_stock ?? 0),
      Number(body.cost_price ?? 0),
      Number(body.sell_price ?? 0),
      body.supplier_id ?? null,
      body.notes ?? null,
      params.id,
    ],
  )
  const result = await db.execute('SELECT * FROM inv_products WHERE id = ?', [params.id])
  return NextResponse.json(result.rows[0])
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await initInventoryTables()
  const db = getDbClient()
  await db.execute('DELETE FROM inv_products WHERE id = ?', [params.id])
  return NextResponse.json({ success: true })
}
