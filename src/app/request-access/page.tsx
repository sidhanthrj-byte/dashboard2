'use client'
import { useState } from 'react'

const ROLES = ['viewer','sales','installer','manager','admin']
const ROLE_DESCRIPTIONS: Record<string, string> = {
  viewer: 'Read-only access to quotes and projects',
  sales: 'Create and manage quotes and projects',
  installer: 'View and update assigned projects',
  manager: 'Full access except user management',
  admin: 'Full access to everything',
}

export default function RequestAccessPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', city: '', requested_role: 'viewer', reason: '' })
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const res = await fetch('/api/access-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Failed to submit'); setLoading(false); return }
    setDone(true)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-gray-900 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-sm">
            <span className="text-white font-black text-lg">P</span>
          </div>
          <h1 className="font-black text-gray-900 text-xl tracking-tight">Request Access</h1>
          <p className="text-gray-500 text-xs mt-1">Submit a request and an admin will approve your account</p>
        </div>

        {done ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
            <div className="text-4xl mb-3">✅</div>
            <h2 className="font-bold text-gray-900 mb-2">Request submitted!</h2>
            <p className="text-gray-500 text-sm">An admin will review your request and approve your access. You&apos;ll be able to log in once approved.</p>
            <a href="/login" className="btn-primary inline-block mt-5 text-sm px-5 py-2">Back to Login</a>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <form onSubmit={submit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="label">Full Name *</label>
                  <input value={form.name} onChange={e=>set('name',e.target.value)} className="input w-full" placeholder="Your name" required />
                </div>
                <div className="col-span-2">
                  <label className="label">Email Address *</label>
                  <input type="email" value={form.email} onChange={e=>set('email',e.target.value)} className="input w-full" placeholder="you@example.com" required />
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input type="tel" value={form.phone} onChange={e=>set('phone',e.target.value)} className="input w-full" placeholder="+91 98765 43210" />
                </div>
                <div>
                  <label className="label">City</label>
                  <input value={form.city} onChange={e=>set('city',e.target.value)} className="input w-full" placeholder="Bengaluru" />
                </div>
              </div>

              <div>
                <label className="label">Access Level Needed</label>
                <select value={form.requested_role} onChange={e=>set('requested_role',e.target.value)} className="input w-full">
                  {ROLES.map(r => <option key={r} value={r} className="capitalize">{r.charAt(0).toUpperCase()+r.slice(1)}</option>)}
                </select>
                <p className="text-xs text-gray-400 mt-1">{ROLE_DESCRIPTIONS[form.requested_role]}</p>
              </div>

              <div>
                <label className="label">Reason for access</label>
                <textarea value={form.reason} onChange={e=>set('reason',e.target.value)} className="input w-full h-20 resize-none" placeholder="Brief description of your role and why you need access…" />
              </div>

              {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">{error}</div>}

              <button type="submit" disabled={loading || !form.name || !form.email} className="btn-primary w-full py-2.5 text-sm disabled:opacity-50">
                {loading ? 'Submitting…' : 'Submit Request'}
              </button>
            </form>

            <div className="mt-4 pt-4 border-t border-gray-100 text-center">
              <p className="text-xs text-gray-500">Already have access? <a href="/login" className="text-gray-900 font-semibold hover:underline">Sign in</a></p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
