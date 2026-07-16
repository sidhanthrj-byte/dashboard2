export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { dbApproveAccessRequest, dbDenyAccessRequest } from '@/lib/db'
import { requireAdmin } from '@/lib/session'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  // Approving a request provisions a user account — admin-only.
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const b = await req.json()
  const approverEmail = auth.user.email

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
