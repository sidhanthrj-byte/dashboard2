export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { dbGetQuote, dbListRevisions, dbCreateRevision } from '@/lib/db'
import { getSessionUser, can } from '@/lib/session'
import type { Quote } from '@/lib/types'

// Ownership + capability guard shared by both handlers.
async function guard(id: string, action: 'view' | 'create') {
  const user = await getSessionUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  if (!can(user, 'quotes', action)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  const quote = await dbGetQuote(id)
  if (!quote) return { error: NextResponse.json({ error: 'Not found' }, { status: 404 }) }
  const owner = (quote as Quote).ownerEmail
  if (!user.isAdmin && owner && owner !== user.email) {
    return { error: NextResponse.json({ error: 'Not found' }, { status: 404 }) }
  }
  return { user, quote }
}

// GET → the full revision trail (original + all revisions) for this quote family.
export async function GET(_: Request, { params }: { params: { id: string } }) {
  const auth = await guard(params.id, 'view')
  if ('error' in auth) return auth.error
  const revisions = await dbListRevisions(params.id)
  return NextResponse.json(revisions)
}

// POST → create a new revision from this quote. The original is never mutated;
// a new linked row is inserted. Requires the 'create' capability on quotes.
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const auth = await guard(params.id, 'create')
  if ('error' in auth) return auth.error
  const patch = await request.json().catch(() => ({}))
  // The client may not override identity/ownership/trail fields.
  delete patch.id; delete patch.ownerEmail; delete patch.parentId
  delete patch.rootId; delete patch.revision; delete patch.revisedBy
  delete patch.quoteNumber
  const revision = await dbCreateRevision(params.id, patch, auth.user.email)
  if (!revision) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(revision, { status: 201 })
}
