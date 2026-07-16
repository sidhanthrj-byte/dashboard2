export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/session'
import { getDbClient, dbSetUserPassword, dbLogActivity } from '@/lib/db'
import { verifyPassword, hasPassword, MIN_PASSWORD_LENGTH } from '@/lib/password'

// Self-service password change for the currently authenticated user. Requires
// the current password when one is already set (so a hijacked session can't
// silently lock the owner out).
export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { currentPassword, newPassword } = await req.json()
  if (!newPassword || String(newPassword).length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` }, { status: 400 })
  }

  const db = getDbClient()
  const row = (await db.execute('SELECT password_hash FROM app_users WHERE id = ?', [user.userId])).rows[0]
  const stored = row ? (row.password_hash as string | null) : null

  if (hasPassword(stored)) {
    const ok = await verifyPassword(String(currentPassword ?? ''), stored)
    if (!ok) return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 403 })
  }

  await dbSetUserPassword(user.userId, String(newPassword))
  await dbLogActivity(user.userId, 'auth.password_change', 'Changed own password')
  return NextResponse.json({ ok: true })
}
