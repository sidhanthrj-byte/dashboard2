export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { dbGetSession } from '@/lib/db'

export async function GET(req: NextRequest) {
  const sessionId = req.cookies.get('pongs_session')?.value
  if (!sessionId) return NextResponse.json(null)
  const session = await dbGetSession(sessionId)
  if (!session) return NextResponse.json(null)
  return NextResponse.json({
    id: session.user_id,
    name: session.name,
    email: session.email,
    role: session.role ?? session.access_level,
  })
}
