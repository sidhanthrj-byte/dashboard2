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
    <div className="min-h-screen flex items-center justify-center px-4 py-10 relative overflow-hidden"
      style={{ background: 'radial-gradient(120% 120% at 50% 0%, #ffffff 0%, var(--bg) 46%, #f2f0ec 100%)' }}>
      {/* Ambient accent wash */}
      <div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[560px] h-[560px] rounded-full blur-3xl opacity-[0.07]"
        style={{ background: 'radial-gradient(circle, #047857, transparent 70%)' }} />

      <div className="w-full max-w-[380px] relative animate-slide-up">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg"
            style={{ background: 'linear-gradient(135deg, #047857, #065f46)' }}>
            <span className="text-white font-black text-xl tracking-tighter">P</span>
          </div>
          <h1 className="font-black text-gray-900 text-2xl tracking-tightest">PONGS</h1>
          <p className="eyebrow mt-1">Stretch Ceiling · Quotation System</p>
        </div>

        <div className="card p-7 shadow-lg">
          <h2 className="font-bold text-gray-900 text-lg tracking-tight">Sign in</h2>
          <p className="text-gray-500 text-[13px] mt-0.5 mb-6">Enter your email to continue to your workspace.</p>

          <form onSubmit={handleLogin} className="space-y-4">
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
              <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-xl px-3.5 py-2.5 text-[13px] text-rose-700 animate-fade-in" role="alert">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="mt-0.5 shrink-0"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
                <span>
                  {error}
                  {error.includes('request access') && (
                    <> <a href="/request-access" className="underline font-semibold whitespace-nowrap">Request access →</a></>
                  )}
                </span>
              </div>
            )}

            <button type="submit" disabled={loading || !email}
              className="btn-primary btn-lg w-full text-sm">
              {loading ? (
                <>
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round"/></svg>
                  Signing in…
                </>
              ) : 'Continue'}
            </button>
          </form>

          <div className="mt-5 pt-5 hairline text-center">
            <p className="text-[13px] text-gray-500">
              Don&apos;t have access?{' '}
              <a href="/request-access" className="text-emerald-700 font-semibold hover:underline underline-offset-2">Request access</a>
            </p>
          </div>
        </div>

        <p className="text-center text-[11px] text-gray-400 mt-6">
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
