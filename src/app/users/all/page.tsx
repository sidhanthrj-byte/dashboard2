'use client'
import { useEffect, useState } from 'react'

interface User {
  id: string; name: string; email: string; phone: string; city: string
  access_level: string; status: string; created_at: string; notes: string
  bases: string
}

const ROLES = ['admin', 'manager', 'editor', 'viewer']
const STATUSES = ['active', 'inactive']
const emptyForm = (): Omit<User, 'id' | 'created_at'> => ({ name: '', email: '', phone: '', city: '', access_level: 'editor', status: 'active', notes: '', bases: '[]' })

const roleBadge: Record<string, string> = {
  admin: 'bg-red-50 text-red-700',
  manager: 'bg-blue-50 text-blue-700',
  editor: 'bg-emerald-50 text-emerald-700',
  viewer: 'bg-gray-100 text-gray-600',
}
const statusBadge: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700',
  inactive: 'bg-gray-100 text-gray-500',
}

export default function AllUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [editId, setEditId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  function load() {
    let url = '/api/users'
    const params: string[] = []
    if (roleFilter) params.push(`access_level=${encodeURIComponent(roleFilter)}`)
    if (statusFilter) params.push(`status=${encodeURIComponent(statusFilter)}`)
    if (params.length) url += '?' + params.join('&')
    fetch(url).then(r => r.json()).then(d => { setUsers(d); setLoading(false) })
  }
  useEffect(() => { load() }, [roleFilter, statusFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (editId) {
      await fetch(`/api/users/${editId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    } else {
      await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    }
    setShowForm(false); setForm(emptyForm()); setEditId(null); load()
  }
  async function handleDelete(id: string) {
    if (!confirm('Delete user?')) return
    await fetch(`/api/users/${id}`, { method: 'DELETE' }); load()
  }
  function openEdit(u: User) {
    setForm({ name: u.name, email: u.email ?? '', phone: u.phone ?? '', city: u.city ?? '', access_level: u.access_level ?? 'editor', status: u.status ?? 'active', notes: u.notes ?? '', bases: u.bases ?? '[]' })
    setEditId(u.id); setShowForm(true)
  }

  const filtered = users.filter(u => !search || u.name.toLowerCase().includes(search.toLowerCase()) || (u.email ?? '').toLowerCase().includes(search.toLowerCase()) || (u.city ?? '').toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">All Users</h1>
          <p className="text-sm text-gray-500 mt-0.5">{users.length} users</p>
        </div>
        <button onClick={() => { setShowForm(true); setForm(emptyForm()); setEditId(null) }} className="btn-primary text-xs px-4 py-2">+ Add User</button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap gap-2">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..." className="flex-1 min-w-[160px] max-w-xs border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400">
            <option value="">All Roles</option>
            {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400">
            <option value="">All Statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>
        {loading ? (
          <p className="text-sm text-gray-400 text-center py-12">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">No users found</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100">
                <th className="text-left px-4 py-2.5 font-medium">Name</th>
                <th className="text-left px-4 py-2.5 font-medium">Email</th>
                <th className="text-left px-4 py-2.5 font-medium">Phone</th>
                <th className="text-left px-4 py-2.5 font-medium">Role</th>
                <th className="text-left px-4 py-2.5 font-medium">City</th>
                <th className="text-left px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-blue-700">{u.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <a href={`/users/${u.id}`} className="font-medium text-gray-900 hover:text-blue-600 hover:underline">{u.name}</a>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{u.email ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{u.phone ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded capitalize ${roleBadge[u.access_level] ?? 'bg-gray-100 text-gray-600'}`}>{u.access_level}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{u.city ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded capitalize ${statusBadge[u.status] ?? 'bg-gray-100 text-gray-500'}`}>{u.status}</span>
                  </td>
                  <td className="px-4 py-3 flex items-center gap-2 justify-end">
                    <button onClick={() => openEdit(u)} className="text-xs text-blue-600 hover:underline">Edit</button>
                    <button onClick={() => handleDelete(u.id)} className="text-xs text-rose-500 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <h2 className="text-base font-bold text-gray-900 mb-4">{editId ? 'Edit' : 'Add'} User</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
                  <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                  <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">City</label>
                  <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
                  <select value={form.access_level} onChange={e => setForm(f => ({ ...f, access_level: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400">
                    {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400">
                    {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                  <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400 resize-none" />
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => { setShowForm(false); setEditId(null) }} className="btn-secondary text-xs px-4 py-2">Cancel</button>
                <button type="submit" className="btn-primary text-xs px-4 py-2">{editId ? 'Save' : 'Add'} User</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
