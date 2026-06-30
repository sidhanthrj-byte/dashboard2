'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function LoginPage() {
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-gray-900 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-sm">
            <span className="text-white font-black text-lg">P</span>
          </div>
          <h1 className="font-black text-gray-900 text-xl tracking-tight">PONGS</h1>
          <p className="text-gray-400 text-xs font-semibold tracking-widest uppercase mt-0.5">Stretch Ceiling</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h2 className="font-bold text-gray-900 text-lg mb-1">Sign in</h2>
          <p className="text-gray-500 text-xs mb-5">Enter your email address to continue</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="label">Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input w-full"
                placeholder="you@example.com"
                required
                autoFocus
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
                {error}
                {error.includes('request access') && (
                  <span> <a href="/request-access" className="underline font-medium">Request access →</a></span>
                )}
              </div>
            )}

            <button type="submit" disabled={loading || !email} className="btn-primary w-full py-2.5 text-sm disabled:opacity-50">
              {loading ? 'Signing in…' : 'Continue'}
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-500">
              Don&apos;t have access?{' '}
              <a href="/request-access" className="text-gray-900 font-semibold hover:underline">Request access</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
