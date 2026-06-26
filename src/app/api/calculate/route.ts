import { NextResponse } from 'next/server'
import { calculateQuote } from '@/lib/calculations'
import type { Quote } from '@/lib/types'

export async function POST(request: Request) {
  const quote: Quote = await request.json()
  const breakdown = calculateQuote(quote)
  return NextResponse.json(breakdown)
}
