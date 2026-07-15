export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { dbListQuotesForUser, dbSaveQuote, dbNextQuoteNumber } from '@/lib/db'
import { getSessionUser, ownerFilterFor } from '@/lib/session'
import { v4 as uuid } from 'uuid'

export async function GET(request: Request) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const now = new Date().toISOString()
    const quote = {
      ...body,
      id: uuid(),
      quoteNumber: await dbNextQuoteNumber(),
      // Ownership assigned from the session — never trusted from the client
      ownerEmail: user.email,
      company: body.company ?? 'STC',
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
