export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { initProjectsTables, initPaymentsTable, dbSeedProjectChecklist, getDbClient, dbGetQuote } from '@/lib/db'
import { requirePermission } from '@/lib/session'

export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  // Converting a quote into a project writes to the projects module.
  const auth = await requirePermission('projects', 'create')
  if ('error' in auth) return auth.error
  await initProjectsTables()
  await initPaymentsTable()
  const quote = await dbGetQuote(params.id)
  if (!quote) return NextResponse.json({ error: 'Quote not found' }, { status: 404 })

  const db = getDbClient()
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  const q = quote as unknown as Record<string,unknown>
  const name = String(q.projectName ?? q.clientName ?? 'New Project')
  const client = String(q.clientName ?? '')
  const phone = String(q.clientPhone ?? '')
  const email = String(q.clientEmail ?? '')
  const location = String(q.location ?? '')
  const value = Number(q.grandTotal ?? 0)

  await db.execute(
    `INSERT INTO projects (id,name,client_name,client_phone,client_email,site_address,status,quote_id,contract_value,priority,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, name, client, phone||null, email||null, location||null, 'scheduled', params.id, value, 'normal', now, now]
  )
  // Mark quote as won
  await db.execute(`UPDATE pongs_quotes SET status='approved', updated_at=? WHERE id=?`, [now, params.id])
  // Seed checklist
  await dbSeedProjectChecklist(id)

  return NextResponse.json({ ok: true, project_id: id }, { status: 201 })
}
