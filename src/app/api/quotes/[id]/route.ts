import { NextResponse } from 'next/server'
import { getQuote, saveQuote, deleteQuote } from '@/lib/store'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const quote = getQuote(params.id)
  if (!quote) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(quote)
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const existing = getQuote(params.id)
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const body = await request.json()
  const updated = { ...existing, ...body, id: params.id, updatedAt: new Date().toISOString() }
  saveQuote(updated)
  return NextResponse.json(updated)
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  deleteQuote(params.id)
  return NextResponse.json({ ok: true })
}
