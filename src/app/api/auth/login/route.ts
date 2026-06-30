export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { dbGetUserByEmail, dbCreateSession } from '@/lib/db'

export async function POST(req: NextRequest) {
  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  const user = await dbGetUserByEmail(email.toLowerCase().trim())
  if (!user) {
    return NextResponse.json({ error: 'No active account found for this email. Please request access.' }, { status: 401 })
  }

  const sessionId = await dbCreateSession(String(user.id))
  const res = NextResponse.json({
    ok: true,
    user: { id: user.id, name: user.name, email: user.email, role: user.role ?? user.access_level }
  })
  res.cookies.set('pongs_session', sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60,
    path: '/',
  })
  return res
}
