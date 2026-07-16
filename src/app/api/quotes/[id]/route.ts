export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { dbGetQuote, dbSaveQuote, dbDeleteQuote } from '@/lib/db'
import { getSessionUser, can } from '@/lib/session'
import type { Quote } from '@/lib/types'
import type { ActionName } from '@/lib/permissions'

// Central guard: the caller must (a) hold the quotes capability for this action
// and (b) own the quote (admins bypass ownership). Returns the quote when
// access is allowed, or a NextResponse error otherwise.
async function authorizeQuote(id: string, action: ActionName) {
  const user = await getSessionUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  if (!can(user, 'quotes', action)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  const quote = await dbGetQuote(id)
  if (!quote) return { error: NextResponse.json({ error: 'Not found' }, { status: 404 }) }
  const owner = (quote as Quote).ownerEmail
  if (!user.isAdmin && owner && owner !== user.email) {
    // Do not leak existence — respond 404 for other users' quotes
    return { error: NextResponse.json({ error: 'Not found' }, { status: 404 }) }
  }
  return { user, quote }
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await authorizeQuote(params.id, 'view')
    if ('error' in auth) return auth.error
    return NextResponse.json(auth.quote)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await authorizeQuote(params.id, 'edit')
    if ('error' in auth) return auth.error
    const body = await request.json()
    const original = auth.quote as Quote
    // Preserve original ownership + revision-trail identity — none of these are
    // reassignable via the client, so an edit can never re-parent a quote.
    const updated = {
      ...original,
      ...body,
      id: params.id,
      ownerEmail: original.ownerEmail,
      parentId: original.parentId,
      rootId: original.rootId ?? params.id,
      revision: original.revision ?? 0,
      revisedBy: original.revisedBy,
      updatedAt: new Date().toISOString(),
    }
    await dbSaveQuote(updated)
    revalidatePath(`/quotes/${params.id}/team`)
    revalidatePath(`/quotes/${params.id}/client`)
    revalidatePath(`/quotes/${params.id}/internal`)
    revalidatePath('/')
    return NextResponse.json(updated)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await authorizeQuote(params.id, 'delete')
    if ('error' in auth) return auth.error
    await dbDeleteQuote(params.id)
    revalidatePath('/')
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
