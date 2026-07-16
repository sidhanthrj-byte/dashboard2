'use client'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/'

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.toLowerCase().trim() }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Login failed')
      setLoading(false)
      return
    }
    router.push(next)
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10" style={{ background: 'var(--paper)' }}>
      <div className="w-full max-w-[380px] animate-slide-up">
        {/* Sheet identity */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 flex items-center justify-center rounded-[3px]" style={{ background: 'var(--ink)' }}>
            <span className="font-display font-bold text-base text-[color:var(--paper)]">P</span>
          </div>
          <div className="leading-tight">
            <div className="font-display font-semibold text-[17px]" style={{ color: 'var(--ink)' }}>Pongs Estimating</div>
            <div className="fig text-[10px] uppercase mt-0.5" style={{ color: 'var(--faint)', letterSpacing: '0.14em' }}>Stretch Ceiling Systems</div>
          </div>
        </div>

        {/* Title block */}
        <div className="sheet">
          <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--rule)' }}>
            <h1 className="font-display text-[17px] font-semibold" style={{ color: 'var(--ink)' }}>Sign in</h1>
            <span className="fig text-[10px] uppercase" style={{ color: 'var(--faint)', letterSpacing: '0.12em' }}>Access</span>
          </div>

          <form onSubmit={handleLogin} className="px-6 py-6 space-y-5">
            <p className="text-[13.5px]" style={{ color: 'var(--ink-3)' }}>Enter your registered email to open your workspace.</p>
            <div>
              <label className="label" htmlFor="login-email">Email address</label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input"
                placeholder="you@company.com"
                required
                autoFocus
                autoComplete="email"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-[3px] px-3.5 py-2.5 text-[13px] animate-fade-in" role="alert"
                style={{ background: 'var(--accent-wash)', border: '1px solid #e2b6ab', color: 'var(--accent-ink)' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="mt-0.5 shrink-0"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
                <span>
                  {error}
                  {error.includes('request access') && (
                    <> <a href="/request-access" className="underline font-semibold whitespace-nowrap">Request access →</a></>
                  )}
                </span>
              </div>
            )}

            <button type="submit" disabled={loading || !email} className="btn-primary btn-lg w-full">
              {loading ? (
                <>
                  <svg className="animate-spin" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round"/></svg>
                  Signing in…
                </>
              ) : 'Continue'}
            </button>
          </form>

          <div className="px-6 py-3.5 text-center" style={{ borderTop: '1px solid var(--rule)' }}>
            <p className="text-[12.5px]" style={{ color: 'var(--muted)' }}>
              Don&apos;t have access?{' '}
              <a href="/request-access" className="font-semibold hover:underline underline-offset-2" style={{ color: 'var(--accent)' }}>Request access</a>
            </p>
          </div>
        </div>

        <p className="fig text-center text-[10px] uppercase mt-6" style={{ color: 'var(--faint)', letterSpacing: '0.12em' }}>
          Secured workspace · Pongs India
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
