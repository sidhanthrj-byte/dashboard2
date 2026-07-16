export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { dbNotificationCounts } from '@/lib/db'
import { requireUser } from '@/lib/session'

export async function GET() {
  const _auth = await requireUser()
  if ('error' in _auth) return _auth.error
  const data = await dbNotificationCounts()
  return NextResponse.json(data)
}
