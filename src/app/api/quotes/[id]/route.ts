export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { dbGetQuote, dbSaveQuote, dbDeleteQuote } from '@/lib/db'
import { getSessionUser } from '@/lib/session'
import type { Quote } from '@/lib/types'

// Central ownership guard: a standard user may only touch quotes they own.
// Admins bypass. Returns the quote if access is allowed, or a NextResponse error.
async function authorizeQuote(id: string) {
  const user = await getSessionUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
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
    const auth = await authorizeQuote(params.id)
    if ('error' in auth) return auth.error
    return NextResponse.json(auth.quote)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await authorizeQuote(params.id)
    if ('error' in auth) return auth.error
    const body = await request.json()
    // Preserve original ownership — never reassignable via the client
    const updated = {
      ...auth.quote,
      ...body,
      id: params.id,
      ownerEmail: (auth.quote as Quote).ownerEmail,
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
    const auth = await authorizeQuote(params.id)
    if ('error' in auth) return auth.error
    await dbDeleteQuote(params.id)
    revalidatePath('/')
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
