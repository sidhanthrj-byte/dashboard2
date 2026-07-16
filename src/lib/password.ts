import { scrypt, randomBytes, timingSafeEqual } from 'crypto'
import { promisify } from 'util'

// Password hashing with Node's built-in scrypt — no external dependency.
// Stored format: scrypt$<saltHex>$<hashHex>. Verification is constant-time.
const scryptAsync = promisify(scrypt)
const KEYLEN = 64

export const MIN_PASSWORD_LENGTH = 8

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const derived = (await scryptAsync(password, salt, KEYLEN)) as Buffer
  return `scrypt$${salt.toString('hex')}$${derived.toString('hex')}`
}

export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored) return false
  const parts = stored.split('$')
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false
  const salt = Buffer.from(parts[1], 'hex')
  const expected = Buffer.from(parts[2], 'hex')
  let derived: Buffer
  try {
    derived = (await scryptAsync(password, salt, expected.length || KEYLEN)) as Buffer
  } catch {
    return false
  }
  if (derived.length !== expected.length) return false
  return timingSafeEqual(derived, expected)
}

// Whether a stored value represents a real, set password.
export function hasPassword(stored: string | null | undefined): boolean {
  return typeof stored === 'string' && stored.startsWith('scrypt$')
}
