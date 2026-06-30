import { NextRequest, NextResponse } from 'next/server'
import { initInventoryTables, getDbClient } from '@/lib/db'

export async function GET() {
  await initInventoryTables()
  const db = getDbClient()
  const result = await db.execute('SELECT * FROM inv_work_completions ORDER BY completion_date DESC')
  return NextResponse.json(result.rows)
}

export async function POST(req: NextRequest) {
  await initInventoryTables()
  const db = getDbClient()
  const body = await req.json()
  const id = crypto.randomUUID()
  await db.execute(
    `INSERT INTO inv_work_completions (id, project_name, client_name, location, completion_date, status, amount, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, body.project_name ?? '', body.client_name ?? null, body.location ?? null, body.completion_date ?? null, body.status ?? 'completed', Number(body.amount ?? 0), body.notes ?? null],
  )
  const result = await db.execute('SELECT * FROM inv_work_completions WHERE id = ?', [id])
  return NextResponse.json(result.rows[0], { status: 201 })
}
