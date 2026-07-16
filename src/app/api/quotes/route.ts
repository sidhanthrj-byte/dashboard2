export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { dbListQuotesForUser, dbSaveQuote, dbNextQuoteNumber } from '@/lib/db'
import { requirePermission, ownerFilterFor } from '@/lib/session'
import { v4 as uuid } from 'uuid'

export async function GET(request: Request) {
  try {
    const auth = await requirePermission('quotes', 'view')
    if ('error' in auth) return auth.error
    const user = auth.user

    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')?.toLowerCase() ?? ''
    const company = searchParams.get('company') ?? ''

    // Server-side ownership enforcement: admins see all, users see only their own
    let quotes = await dbListQuotesForUser(ownerFilterFor(user))

    if (company && company !== 'all') {
      quotes = quotes.filter(quote => (quote.company ?? 'STC') === company)
    }
    if (q) {
      quotes = quotes.filter(
        quote =>
          quote.clientName?.toLowerCase().includes(q) ||
          quote.projectName?.toLowerCase().includes(q) ||
          quote.quoteNumber?.toLowerCase().includes(q) ||
          quote.location?.toLowerCase().includes(q),
      )
    }
    return NextResponse.json(quotes)
  } catch (err) {
    console.error('GET /api/quotes error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requirePermission('quotes', 'create')
    if ('error' in auth) return auth.error
    const user = auth.user

    const body = await request.json()
    const now = new Date().toISOString()
    const id = uuid()
    const quote = {
      ...body,
      id,
      quoteNumber: await dbNextQuoteNumber(),
      // Ownership assigned from the session — never trusted from the client
      ownerEmail: user.email,
      company: body.company ?? 'STC',
      // A freshly created quote is always an original (root of its own trail).
      parentId: undefined,
      rootId: id,
      revision: 0,
      revisedBy: undefined,
      createdAt: now,
      updatedAt: now,
    }
    await dbSaveQuote(quote)
    return NextResponse.json(quote, { status: 201 })
  } catch (err) {
    console.error('POST /api/quotes error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
