export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { dbApproveAccessRequest, dbDenyAccessRequest, dbGetSession } from '@/lib/db'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const sessionId = req.cookies.get('pongs_session')?.value
  if (!sessionId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const session = await dbGetSession(sessionId)
  const role = String(session?.role ?? session?.access_level ?? '')
  if (!session || !['admin', 'manager'].includes(role)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const b = await req.json()
  const approverEmail = String(session.email)

  if (b.action === 'approve') {
    await dbApproveAccessRequest(params.id, approverEmail, b.role ?? 'viewer')
    return NextResponse.json({ ok: true })
  }
  if (b.action === 'deny') {
    await dbDenyAccessRequest(params.id, approverEmail, b.notes)
    return NextResponse.json({ ok: true })
  }
  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
