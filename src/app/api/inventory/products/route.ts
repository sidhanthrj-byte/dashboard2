import { NextRequest, NextResponse } from 'next/server'
import { initInventoryTables, getDbClient } from '@/lib/db'

export async function GET(req: NextRequest) {
  await initInventoryTables()
  const db = getDbClient()
  const category = req.nextUrl.searchParams.get('category')
  const sql = category
    ? 'SELECT * FROM inv_products WHERE category = ? ORDER BY name'
    : 'SELECT * FROM inv_products ORDER BY name'
  const result = category
    ? await db.execute(sql, [category])
    : await db.execute(sql)
  return NextResponse.json(result.rows)
}

export async function POST(req: NextRequest) {
  await initInventoryTables()
  const db = getDbClient()
  const body = await req.json()
  const id = crypto.randomUUID()
  await db.execute(
    `INSERT INTO inv_products (id, name, category, sku, unit, current_stock, min_stock, cost_price, sell_price, supplier_id, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
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
    ],
  )
  const result = await db.execute('SELECT * FROM inv_products WHERE id = ?', [id])
  return NextResponse.json(result.rows[0], { status: 201 })
}
