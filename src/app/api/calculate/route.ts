export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { calculateQuote } from '@/lib/calculations'
import type { Quote } from '@/lib/types'
import { requireUser } from '@/lib/session'

export async function POST(request: Request) {
  const _auth = await requireUser()
  if ('error' in _auth) return _auth.error
  const body: Quote = await request.json()
  const breakdown = calculateQuote(body)
  return NextResponse.json(breakdown)
}
