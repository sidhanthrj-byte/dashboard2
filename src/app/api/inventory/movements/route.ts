import { NextRequest, NextResponse } from 'next/server'
import { initInventoryTables, getDbClient } from '@/lib/db'

export async function GET() {
  await initInventoryTables()
  const db = getDbClient()
  const result = await db.execute('SELECT * FROM inv_movements ORDER BY movement_date DESC')
  return NextResponse.json(result.rows)
}

export async function POST(req: NextRequest) {
  await initInventoryTables()
  const db = getDbClient()
  const body = await req.json()
  const id = crypto.randomUUID()
  await db.execute(
    `INSERT INTO inv_movements (id, product_id, product_name, movement_type, quantity, reference_type, reference_id, notes, movement_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, body.product_id ?? null, body.product_name ?? null, body.movement_type ?? 'IN', Number(body.quantity ?? 0), body.reference_type ?? null, body.reference_id ?? null, body.notes ?? null, body.movement_date ?? new Date().toISOString()],
  )
  const result = await db.execute('SELECT * FROM inv_movements WHERE id = ?', [id])
  return NextResponse.json(result.rows[0], { status: 201 })
}
