import { NextRequest, NextResponse } from 'next/server'
import { initInventoryTables, getDbClient } from '@/lib/db'

export async function GET() {
  await initInventoryTables()
  const db = getDbClient()
  const purchases = await db.execute('SELECT * FROM inv_purchases ORDER BY purchase_date DESC')
  const items = await db.execute('SELECT * FROM inv_purchase_items')
  const itemsByPurchase: Record<string, unknown[]> = {}
  for (const item of items.rows) {
    const pid = String(item.purchase_id)
    if (!itemsByPurchase[pid]) itemsByPurchase[pid] = []
    itemsByPurchase[pid].push(item)
  }
  const result = purchases.rows.map(p => ({ ...p, items: itemsByPurchase[String(p.id)] ?? [] }))
  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  await initInventoryTables()
  const db = getDbClient()
  const body = await req.json()
  const id = crypto.randomUUID()
  const items: Record<string, unknown>[] = body.items ?? []
  const totalAmount = items.reduce((s: number, i: Record<string, unknown>) => s + Number(i.total_price ?? 0), 0)

  await db.execute(
    `INSERT INTO inv_purchases (id, purchase_number, supplier_id, supplier_name, purchase_date, total_amount, status, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, body.purchase_number ?? '', body.supplier_id ?? null, body.supplier_name ?? null, body.purchase_date ?? new Date().toISOString().slice(0,10), totalAmount, body.status ?? 'received', body.notes ?? null],
  )

  for (const item of items) {
    const itemId = crypto.randomUUID()
    await db.execute(
      `INSERT INTO inv_purchase_items (id, purchase_id, product_id, description, category, quantity, unit, unit_price, total_price)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [itemId, id, item.product_id ?? null, item.description ?? null, item.category ?? null, Number(item.quantity ?? 0), item.unit ?? 'nos', Number(item.unit_price ?? 0), Number(item.total_price ?? 0)],
    )
  }

  const result = await db.execute('SELECT * FROM inv_purchases WHERE id = ?', [id])
  const itemsResult = await db.execute('SELECT * FROM inv_purchase_items WHERE purchase_id = ?', [id])
  return NextResponse.json({ ...result.rows[0], items: itemsResult.rows }, { status: 201 })
}
