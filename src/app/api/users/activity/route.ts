export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { dbListActivity, dbLogActivity } from '@/lib/db'
import { requireAdmin } from '@/lib/session'

export async function GET(req: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error
  const limit = Number(req.nextUrl.searchParams.get('limit') ?? 100)
  const rows = await dbListActivity(limit)
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error
  const body = await req.json()
  // Attribute the log entry to the authenticated admin, never a client value.
  await dbLogActivity(auth.user.userId, String(body.action ?? 'unknown'), body.details ?? null)
  return NextResponse.json({ ok: true }, { status: 201 })
}
