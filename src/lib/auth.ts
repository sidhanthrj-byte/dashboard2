import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import { v4 as uuid } from 'uuid'
import { dbCountUsers, dbCreateUser, dbGetUserByEmail } from './db'
import type { UserRole } from './types'

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'pongs-quotation-jwt-secret-2026'
)
export const SESSION_COOKIE = 'pongs_quote_session'

export interface Session {
  userId: string
  name: string
  role: UserRole
}

export async function createSessionToken(s: Session): Promise<string> {
  return new SignJWT({ ...s })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30d')
    .sign(SECRET)
}

/** Reads and verifies the session cookie. Returns null when not logged in. */
export async function getSession(): Promise<Session | null> {
  try {
    const token = cookies().get(SESSION_COOKIE)?.value
    if (!token) return null
    const { payload } = await jwtVerify(token, SECRET)
    return {
      userId: String(payload.userId),
      name: String(payload.name),
      role: payload.role === 'admin' ? 'admin' : 'user',
    }
  } catch {
    return null
  }
}

export function isAdmin(s: Session | null): boolean {
  return s?.role === 'admin'
}

// Shared ownership check so a user can never read/edit/delete another
// employee's quotation by changing the URL or calling the API directly.
// Quotes with no owner (created before user accounts existed) are admin-only.
export function canAccessQuote(
  s: Session | null,
  quote: { createdBy?: string | null },
): boolean {
  if (!s) return false
  if (isAdmin(s)) return true
  return !!quote.createdBy && quote.createdBy === s.userId
}

/**
 * Ensures at least one account exists so the team can log in on first deploy.
 * Default admin: ADMIN_EMAIL / ADMIN_PASSWORD env vars (falls back to
 * admin@pongsindia.com / admin123 — change the password after first login).
 */
export async function ensureAdminSeeded() {
  const count = await dbCountUsers()
  if (count > 0) return
  const email = process.env.ADMIN_EMAIL || 'admin@pongsindia.com'
  const password = process.env.ADMIN_PASSWORD || 'admin123'
  await dbCreateUser({
    id: uuid(),
    name: 'Administrator',
    email,
    passwordHash: await bcrypt.hash(password, 10),
    role: 'admin',
  })
}

export async function verifyCredentials(email: string, password: string) {
  await ensureAdminSeeded()
  const user = await dbGetUserByEmail(email)
  if (!user) return null
  const ok = await bcrypt.compare(password, user.passwordHash)
  return ok ? user : null
}
