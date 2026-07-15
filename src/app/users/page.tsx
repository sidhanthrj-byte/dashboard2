'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Plus, ShieldCheck, User } from 'lucide-react'
import type { AppUser } from '@/lib/types'

export default function UsersPage() {
  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'user' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const res = await fetch('/api/users')
    if (res.status === 403) { setForbidden(true); setLoading(false); return }
    setUsers(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function createUser(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Failed to create user')
      return
    }
    setForm({ name: '', email: '', password: '', role: 'user' })
    load()
  }

  if (forbidden) {
    return <div className="card p-10 text-center text-gray-500">Only administrators can manage users.</div>
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Team Members</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Employees see only their own quotations. Admins see everything.
        </p>
      </div>

      <div className="card p-6">
        <h2 className="font-semibold text-gray-800 mb-4">Add employee</h2>
        <form onSubmit={createUser} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Name</label>
            <input className="input" required value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" className="input" required value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div>
            <label className="label">Password</label>
            <input type="password" className="input" required minLength={6} value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
          </div>
          <div>
            <label className="label">Role</label>
            <select className="select" value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
              <option value="user">Employee</option>
              <option value="admin">Administrator</option>
            </select>
          </div>
          {error && <p className="text-sm text-rose-600 sm:col-span-2">{error}</p>}
          <div className="sm:col-span-2">
            <button type="submit" disabled={saving} className="btn-primary text-sm gap-2">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add user
            </button>
          </div>
        </form>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400"><Loader2 size={18} className="animate-spin inline" /></div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-800">{u.name}</td>
                  <td className="px-5 py-3 text-gray-500">{u.email}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                      u.role === 'admin' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {u.role === 'admin' ? <ShieldCheck size={11} /> : <User size={11} />}
                      {u.role === 'admin' ? 'Admin' : 'Employee'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
