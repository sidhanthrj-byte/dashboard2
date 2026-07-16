export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getDbClient, dbUpdateUser, dbDeleteUser, dbLogActivity } from '@/lib/db'
import { requireAdmin } from '@/lib/session'
import { MIN_PASSWORD_LENGTH } from '@/lib/password'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error
  const db = getDbClient()
  const result = await db.execute('SELECT * FROM app_users WHERE id = ?', [params.id])
  if (!result.rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(result.rows[0])
}

// Editing a user — including changing their role/permissions — is admin-only.
// dbUpdateUser normalises role↔access_level↔permissions server-side.
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error
  const body = await req.json()
  if (typeof body.password === 'string' && body.password && body.password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` }, { status: 400 })
  }
  const updated = await dbUpdateUser(params.id, body)
  await dbLogActivity(auth.user.userId, 'user.update', `Updated user ${params.id}`)
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error
  // Guard: an admin cannot delete their own account (avoids self-lockout).
  if (auth.user.userId === params.id) {
    return NextResponse.json({ error: 'You cannot delete your own account.' }, { status: 400 })
  }
  await dbDeleteUser(params.id)
  await dbLogActivity(auth.user.userId, 'user.delete', `Deleted user ${params.id}`)
  return NextResponse.json({ success: true })
}
