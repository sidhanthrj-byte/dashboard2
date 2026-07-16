export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { initFollowupsTable, getDbClient } from '@/lib/db'
import { requirePermission } from '@/lib/session'

export async function GET(req: NextRequest) {
  const _auth = await requirePermission('quotes', 'view')
  if ('error' in _auth) return _auth.error
  await initFollowupsTable()
  const db = getDbClient()
  const done = req.nextUrl.searchParams.get('done')
  const sql = done === null
    ? 'SELECT f.*, q.grand_total FROM follow_ups f LEFT JOIN pongs_quotes q ON q.id = f.quote_id ORDER BY f.due_date ASC'
    : 'SELECT f.*, q.grand_total FROM follow_ups f LEFT JOIN pongs_quotes q ON q.id = f.quote_id WHERE f.done = ? ORDER BY f.due_date ASC'
  const r = done === null ? await db.execute(sql) : await db.execute(sql, [done === '1' ? 1 : 0])
  return NextResponse.json(r.rows)
}

export async function POST(req: NextRequest) {
  const _auth = await requirePermission('quotes', 'edit')
  if ('error' in _auth) return _auth.error
  await initFollowupsTable()
  const db = getDbClient()
  const b = await req.json()
  const id = crypto.randomUUID()
  await db.execute(
    'INSERT INTO follow_ups (id,quote_id,client_name,due_date,note) VALUES (?,?,?,?,?)',
    [id, b.quote_id, b.client_name, b.due_date, b.note??null]
  )
  return NextResponse.json({ ok: true, id }, { status: 201 })
}
