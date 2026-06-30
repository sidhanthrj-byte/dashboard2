import { NextRequest, NextResponse } from 'next/server'
import { initProjectsTables, getDbClient } from '@/lib/db'

export async function GET(req: NextRequest) {
  await initProjectsTables()
  const db = getDbClient()
  const status = req.nextUrl.searchParams.get('status')
  const month = req.nextUrl.searchParams.get('month')
  let sql = 'SELECT * FROM projects'
  const args: string[] = []
  const where: string[] = []
  if (status && status !== 'all') { where.push('status = ?'); args.push(status) }
  if (month) { where.push("scheduled_date LIKE ?"); args.push(`${month}%`) }
  if (where.length) sql += ' WHERE ' + where.join(' AND ')
  sql += ' ORDER BY scheduled_date DESC, created_at DESC'
  const result = args.length ? await db.execute(sql, args) : await db.execute(sql)
  return NextResponse.json(result.rows)
}

export async function POST(req: NextRequest) {
  await initProjectsTables()
  const db = getDbClient()
  const b = await req.json()
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  await db.execute(
    `INSERT INTO projects (id,name,client_name,client_phone,client_email,site_address,city,quote_id,status,scheduled_date,completion_date,team_lead,team_members,ceiling_area_sqft,contract_value,priority,notes,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id,b.name??'',b.client_name??'',b.client_phone??null,b.client_email??null,b.site_address??null,b.city??null,b.quote_id??null,b.status??'scheduled',b.scheduled_date??null,b.completion_date??null,b.team_lead??null,JSON.stringify(b.team_members??[]),Number(b.ceiling_area_sqft??0),Number(b.contract_value??0),b.priority??'normal',b.notes??null,now,now]
  )
  const r = await db.execute('SELECT * FROM projects WHERE id = ?', [id])
  return NextResponse.json(r.rows[0], { status: 201 })
}
