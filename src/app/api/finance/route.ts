export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { initPaymentsTable, initProjectsTables, getDbClient } from '@/lib/db'

export async function GET() {
  await initProjectsTables()
  await initPaymentsTable()
  const db = getDbClient()

  const projects = await db.execute('SELECT id, name, client_name, status, contract_value, created_at FROM projects ORDER BY created_at DESC')

  const result = await Promise.all(projects.rows.map(async (p) => {
    const pid = String(p.id)
    const payments = await db.execute('SELECT COALESCE(SUM(amount),0) as total FROM project_payments WHERE project_id = ?', [pid])
    const expenses = await db.execute('SELECT COALESCE(SUM(amount),0) as total FROM project_expenses WHERE project_id = ?', [pid])
    return {
      ...p,
      total_paid: Number((payments.rows[0] as Record<string, unknown>).total ?? 0),
      total_expenses: Number((expenses.rows[0] as Record<string, unknown>).total ?? 0),
    }
  }))

  return NextResponse.json(result)
}
