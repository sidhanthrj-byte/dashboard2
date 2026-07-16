export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/session'

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json(null)
  return NextResponse.json({
    id: user.userId,
    name: user.name,
    email: user.email,
    role: user.role,
    isAdmin: user.isAdmin,
    permissions: user.permissions,
  })
}
