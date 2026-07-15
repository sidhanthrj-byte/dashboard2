import { cookies } from 'next/headers'
import { dbGetSession } from './db'

export interface SessionUser {
  userId: string
  name: string
  email: string
  role: string
  isAdmin: boolean
}

// Reads the pongs_session cookie and returns the authenticated user, or null.
// Central place for RBAC so permission logic is never duplicated across routes.
export async function getSessionUser(): Promise<SessionUser | null> {
  const sessionId = cookies().get('pongs_session')?.value
  if (!sessionId) return null
  const session = await dbGetSession(sessionId)
  if (!session) return null
  const role = String((session.role ?? session.access_level ?? 'viewer'))
  const email = String(session.email ?? '')
  const isAdmin = role === 'admin' || email.toLowerCase() === 'sidhanthrj@gmail.com'
  return {
    userId: String(session.user_id),
    name: String(session.name ?? ''),
    email,
    role,
    isAdmin,
  }
}

// Server-page guard: may the current session view this quote (by owner email)?
// Admins always may; standard users only their own; legacy null-owner allowed.
export async function canAccessQuote(ownerEmail: string | undefined | null): Promise<boolean> {
  const user = await getSessionUser()
  if (!user) return false
  if (user.isAdmin) return true
  if (!ownerEmail) return true
  return ownerEmail === user.email
}

// Returns the owner-email filter to apply to quote queries:
//   null  → admin, sees everything
//   email → standard user, sees only their own quotes
export function ownerFilterFor(user: SessionUser | null): string | null {
  if (!user) return '__no_access__' // unauthenticated → matches nothing
  return user.isAdmin ? null : user.email
}
