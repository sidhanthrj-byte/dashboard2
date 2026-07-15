import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'pongs-quotation-jwt-secret-2026'
)

// Every page and API route (except login/auth) requires a valid session.
// Fine-grained ownership checks happen server-side in the API/page handlers.
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next()
  }
  const token = req.cookies.get('pongs_quote_session')?.value
  const deny = () =>
    pathname.startsWith('/api/')
      ? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      : NextResponse.redirect(new URL('/login', req.url))
  if (!token) return deny()
  try {
    await jwtVerify(token, SECRET)
    return NextResponse.next()
  } catch {
    return deny()
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
