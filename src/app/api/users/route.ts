import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { v4 as uuid } from 'uuid'
import { getSession, isAdmin } from '@/lib/auth'
import { dbCreateUser, dbGetUserByEmail, dbListUsers } from '@/lib/db'

export const dynamic = 'force-dynamic'

// User management is admin-only (RBAC enforced server-side).
export async function GET() {
  const session = await getSession()
  if (!isAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return NextResponse.json(await dbListUsers())
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!isAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const { name, email, password, role } = await request.json()
    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email and password required' }, { status: 400 })
    }
    if (await dbGetUserByEmail(String(email))) {
      return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 })
    }
    const user = {
      id: uuid(),
      name: String(name),
      email: String(email),
      passwordHash: await bcrypt.hash(String(password), 10),
      role: (role === 'admin' ? 'admin' : 'user') as 'admin' | 'user',
    }
    await dbCreateUser(user)
    return NextResponse.json({ id: user.id, name: user.name, email: user.email, role: user.role }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
