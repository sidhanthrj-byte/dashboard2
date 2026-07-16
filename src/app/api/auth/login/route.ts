export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { dbGetUserByEmail, dbCreateSession, dbSetUserPassword, dbLogActivity } from '@/lib/db'
import { verifyPassword, hasPassword, MIN_PASSWORD_LENGTH } from '@/lib/password'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  const user = await dbGetUserByEmail(String(email).toLowerCase().trim())
  if (!user) {
    return NextResponse.json({ error: 'No active account found for this email. Please request access.' }, { status: 401 })
  }

  const stored = user.password_hash as string | null

  if (hasPassword(stored)) {
    // Normal path: a password exists and must match.
    if (!password) {
      return NextResponse.json({ error: 'Password required', needsPassword: true }, { status: 401 })
    }
    const ok = await verifyPassword(String(password), stored)
    if (!ok) {
      return NextResponse.json({ error: 'Incorrect email or password.' }, { status: 401 })
    }
  } else {
    // First-time bootstrap: this account has never set a password. Require the
    // user to create one now (no weaker than the previous email-only login).
    if (!password) {
      return NextResponse.json({
        error: 'Set a password to secure your account.',
        needsPassword: true,
        firstTime: true,
      }, { status: 401 })
    }
    if (String(password).length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json({
        error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
        needsPassword: true,
        firstTime: true,
      }, { status: 400 })
    }
    await dbSetUserPassword(String(user.id), String(password))
    await dbLogActivity(String(user.id), 'auth.password_set', 'Set password on first login')
  }

  const sessionId = await dbCreateSession(String(user.id))
  const res = NextResponse.json({
    ok: true,
    user: { id: user.id, name: user.name, email: user.email, role: user.role ?? user.access_level },
  })
  res.cookies.set('pongs_session', sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60,
    path: '/',
  })
  return res
}
