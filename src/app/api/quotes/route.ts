import { NextResponse } from 'next/server'
import { dbListQuotes, dbSaveQuote, dbNextQuoteNumber } from '@/lib/db'
import { getSession, isAdmin } from '@/lib/auth'
import { DEFAULT_COMPANY, COMPANIES } from '@/lib/companies'
import { v4 as uuid } from 'uuid'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')?.toLowerCase() ?? ''
    const company = searchParams.get('company') ?? ''
    // Non-admins only ever see their own quotations (enforced at the DB query).
    let quotes = await dbListQuotes(isAdmin(session) ? undefined : session.userId)
    if (company && COMPANIES[company as keyof typeof COMPANIES]) {
      quotes = quotes.filter(quote => (quote.company ?? DEFAULT_COMPANY) === company)
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
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await request.json()
    const now = new Date().toISOString()
    const quote = {
      ...body,
      id: uuid(),
      quoteNumber: await dbNextQuoteNumber(),
      company: COMPANIES[body.company as keyof typeof COMPANIES] ? body.company : DEFAULT_COMPANY,
      // The logged-in user always becomes the owner of a new quotation.
      createdBy: session.userId,
      createdByName: session.name,
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
