import { NextResponse } from 'next/server'
import { dbNotificationCounts } from '@/lib/db'

export async function GET() {
  const data = await dbNotificationCounts()
  return NextResponse.json(data)
}
