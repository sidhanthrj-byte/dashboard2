import { NextResponse } from 'next/server'
import { dbListQuotes, dbSaveQuote, dbNextQuoteNumber } from '@/lib/db'
import { v4 as uuid } from 'uuid'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')?.toLowerCase() ?? ''
    let quotes = await dbListQuotes()
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
    const body = await request.json()
    const now = new Date().toISOString()
    const quote = {
      ...body,
      id: uuid(),
      quoteNumber: await dbNextQuoteNumber(),
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
