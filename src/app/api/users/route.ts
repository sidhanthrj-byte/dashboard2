export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getDbClient, dbCreateUser, dbLogActivity } from '@/lib/db'
import { requireAdmin } from '@/lib/session'

// Listing the user directory is an admin-only capability.
export async function GET(req: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const db = getDbClient()
  const { searchParams } = req.nextUrl
  const city = searchParams.get('city')
  const status = searchParams.get('status')
  const access_level = searchParams.get('access_level')

  let sql = 'SELECT * FROM app_users WHERE 1=1'
  const args: string[] = []
  if (city) { sql += ' AND city = ?'; args.push(city) }
  if (status) { sql += ' AND status = ?'; args.push(status) }
  if (access_level) { sql += ' AND access_level = ?'; args.push(access_level) }
  sql += ' ORDER BY name'

  const result = args.length ? await db.execute(sql, args) : await db.execute(sql)
  return NextResponse.json(result.rows)
}

// Only an administrator may create users. Role + permissions are normalised
// server-side (see dbCreateUser) so a non-admin can never mint an admin and a
// client can never smuggle in a role/permission set it wasn't granted.
export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const body = await req.json()
  const created = await dbCreateUser(body)
  await dbLogActivity(auth.user.userId, 'user.create', `Created user ${body.email ?? body.name}`)
  return NextResponse.json(created, { status: 201 })
}
