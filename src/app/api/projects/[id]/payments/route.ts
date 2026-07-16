export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { initPaymentsTable, getDbClient } from '@/lib/db'
import { requirePermission } from '@/lib/session'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const _auth = await requirePermission('projects', 'view')
  if ('error' in _auth) return _auth.error
  await initPaymentsTable()
  const db = getDbClient()
  const payments = await db.execute('SELECT * FROM project_payments WHERE project_id = ? ORDER BY payment_date DESC', [params.id])
  const expenses = await db.execute('SELECT * FROM project_expenses WHERE project_id = ? ORDER BY expense_date DESC', [params.id])
  const project = await db.execute('SELECT contract_value FROM projects WHERE id = ?', [params.id])
  const contractValue = Number(project.rows[0]?.contract_value ?? 0)
  const totalPaid = payments.rows.reduce((s, r) => s + Number(r.amount ?? 0), 0)
  const totalExpenses = expenses.rows.reduce((s, r) => s + Number(r.amount ?? 0), 0)
  return NextResponse.json({ payments: payments.rows, expenses: expenses.rows, contractValue, totalPaid, totalExpenses, outstanding: contractValue - totalPaid })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const _auth = await requirePermission('projects', 'edit')
  if ('error' in _auth) return _auth.error
  await initPaymentsTable()
  const db = getDbClient()
  const b = await req.json()
  const id = crypto.randomUUID()
  await db.execute(
    'INSERT INTO project_payments (id,project_id,type,amount,payment_date,method,reference,notes) VALUES (?,?,?,?,?,?,?,?)',
    [id, params.id, b.type??'payment', Number(b.amount), b.payment_date, b.method??'bank_transfer', b.reference??null, b.notes??null]
  )
  const r = await db.execute('SELECT * FROM project_payments WHERE id = ?', [id])
  return NextResponse.json(r.rows[0], { status: 201 })
}
