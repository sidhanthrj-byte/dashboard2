import { NextResponse } from 'next/server'
import { readQuotes, saveQuote, nextQuoteNumber } from '@/lib/store'
import { v4 as uuid } from 'uuid'
import type { Quote } from '@/lib/types'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.toLowerCase() ?? ''
  let quotes = readQuotes()
  if (q) {
    quotes = quotes.filter(
      quote =>
        quote.clientName.toLowerCase().includes(q) ||
        quote.projectName.toLowerCase().includes(q) ||
        quote.quoteNumber.toLowerCase().includes(q) ||
        quote.location.toLowerCase().includes(q),
    )
  }
  return NextResponse.json(quotes.sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
}

export async function POST(request: Request) {
  const body = await request.json()
  const now = new Date().toISOString()
  const quote: Quote = {
    ...body,
    id: uuid(),
    quoteNumber: nextQuoteNumber(),
    createdAt: now,
    updatedAt: now,
  }
  saveQuote(quote)
  return NextResponse.json(quote, { status: 201 })
}
