import { NextRequest, NextResponse } from 'next/server'
import { dbListActivity, dbLogActivity } from '@/lib/db'

export async function GET(req: NextRequest) {
  const limit = Number(req.nextUrl.searchParams.get('limit') ?? 100)
  const rows = await dbListActivity(limit)
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  await dbLogActivity(body.user_id ?? null, body.action ?? 'unknown', body.details ?? null)
  return NextResponse.json({ ok: true }, { status: 201 })
}
