export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { initPaymentsTable, getDbClient } from '@/lib/db'
import { requirePermission } from '@/lib/session'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const _auth = await requirePermission('projects', 'edit')
  if ('error' in _auth) return _auth.error
  await initPaymentsTable()
  const db = getDbClient()
  const b = await req.json()
  const id = crypto.randomUUID()
  await db.execute(
    'INSERT INTO project_expenses (id,project_id,category,description,amount,expense_date,paid_to,notes) VALUES (?,?,?,?,?,?,?,?)',
    [id, params.id, b.category??'materials', b.description, Number(b.amount), b.expense_date, b.paid_to??null, b.notes??null]
  )
  const r = await db.execute('SELECT * FROM project_expenses WHERE id = ?', [id])
  return NextResponse.json(r.rows[0], { status: 201 })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const _auth = await requirePermission('projects', 'edit')
  if ('error' in _auth) return _auth.error
  await initPaymentsTable()
  const db = getDbClient()
  const { expense_id } = await req.json()
  await db.execute('DELETE FROM project_expenses WHERE id = ? AND project_id = ?', [expense_id, params.id])
  return NextResponse.json({ ok: true })
}
