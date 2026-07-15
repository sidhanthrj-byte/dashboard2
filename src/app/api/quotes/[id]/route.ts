import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { dbGetQuote, dbSaveQuote, dbDeleteQuote } from '@/lib/db'
import { getSession, canAccessQuote } from '@/lib/auth'

export const dynamic = 'force-dynamic'

async function authorize(id: string) {
  const session = await getSession()
  if (!session) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  const quote = await dbGetQuote(id)
  if (!quote) {
    return { error: NextResponse.json({ error: 'Not found' }, { status: 404 }) }
  }
  if (!canAccessQuote(session, quote)) {
    // 404 (not 403) so quote existence isn't leaked across users
    return { error: NextResponse.json({ error: 'Not found' }, { status: 404 }) }
  }
  return { session, quote }
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await authorize(params.id)
    if ('error' in auth) return auth.error
    return NextResponse.json(auth.quote)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await authorize(params.id)
    if ('error' in auth) return auth.error
    const body = await request.json()
    const updated = {
      ...auth.quote,
      ...body,
      id: params.id,
      // Ownership is preserved for the whole quotation lifecycle
      createdBy: auth.quote.createdBy ?? auth.session.userId,
      createdByName: auth.quote.createdByName ?? auth.session.name,
      updatedAt: new Date().toISOString(),
    }
    await dbSaveQuote(updated)
    // Bust the cache for all views of this quote
    revalidatePath(`/quotes/${params.id}/team`)
    revalidatePath(`/quotes/${params.id}/client`)
    revalidatePath('/')
    return NextResponse.json(updated)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await authorize(params.id)
    if ('error' in auth) return auth.error
    await dbDeleteQuote(params.id)
    revalidatePath('/')
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
