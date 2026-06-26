import { NextResponse } from 'next/server'
import { dbGetQuote, dbSaveQuote, dbDeleteQuote } from '@/lib/db'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const quote = await dbGetQuote(params.id)
    if (!quote) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(quote)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const existing = await dbGetQuote(params.id)
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const body = await request.json()
    const updated = { ...existing, ...body, id: params.id, updatedAt: new Date().toISOString() }
    await dbSaveQuote(updated)
    return NextResponse.json(updated)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    await dbDeleteQuote(params.id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
