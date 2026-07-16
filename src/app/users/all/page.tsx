'use client'
import { useEffect, useState } from 'react'
import Gate from '@/components/Gate'
import {
  MODULES, MODULE_LABELS, ACTIONS, emptyPermissions,
  parsePermissions, type UserPermissions, type ModuleName, type ActionName,
} from '@/lib/permissions'

interface User {
  id: string; name: string; email: string; phone: string; city: string
  access_level: string; role: string; status: string; created_at: string; notes: string
  bases: string; permissions_json?: string
}

const STATUSES = ['active', 'inactive']

interface FormState {
  name: string; email: string; phone: string; city: string
  status: string; notes: string; bases: string
  password: string
  isAdmin: boolean
  permissions: UserPermissions
}

const emptyForm = (): FormState => ({
  name: '', email: '', phone: '', city: '', status: 'active', notes: '', bases: '[]',
  password: '',
  isAdmin: false, permissions: emptyPermissions(),
})

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

function AllUsersInner() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [editId, setEditId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [error, setError] = useState('')

  function load() {
    let url = '/api/users'
    const params: string[] = []
    if (roleFilter) params.push(`access_level=${encodeURIComponent(roleFilter)}`)
    if (statusFilter) params.push(`status=${encodeURIComponent(statusFilter)}`)
    if (params.length) url += '?' + params.join('&')
    fetch(url).then(r => r.json()).then(d => { setUsers(Array.isArray(d) ? d : []); setLoading(false) })
  }
  useEffect(() => { load() }, [roleFilter, statusFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    // The role/permissions the server persists are derived from these fields.
    const payload = {
      name: form.name, email: form.email, phone: form.phone, city: form.city,
      status: form.status, notes: form.notes, bases: form.bases,
      role: form.isAdmin ? 'admin' : 'viewer',
      is_admin: form.isAdmin,
      permissions: form.isAdmin ? undefined : form.permissions,
      // Blank on edit = keep existing password; set = create/reset it.
      password: form.password || undefined,
    }
    const res = editId
      ? await fetch(`/api/users/${editId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      : await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? 'Failed to save user'); return
    }
    setShowForm(false); setForm(emptyForm()); setEditId(null); load()
  }
  async function handleDelete(id: string) {
    if (!confirm('Delete user?')) return
    const res = await fetch(`/api/users/${id}`, { method: 'DELETE' })
    if (!res.ok) { const d = await res.json().catch(() => ({})); alert(d.error ?? 'Failed to delete'); return }
    load()
  }
  function openEdit(u: User) {
    const isAdmin = (u.role ?? u.access_level) === 'admin'
    setForm({
      name: u.name, email: u.email ?? '', phone: u.phone ?? '', city: u.city ?? '',
      status: u.status ?? 'active', notes: u.notes ?? '', bases: u.bases ?? '[]',
      password: '',
      isAdmin,
      permissions: parsePermissions(u.permissions_json),
    })
    setEditId(u.id); setShowForm(true); setError('')
  }

  function togglePerm(module: ModuleName, action: ActionName) {
    setForm(f => {
      const mod = { ...f.permissions[module], [action]: !f.permissions[module][action] }
      // Turning off view cascades off the write actions; turning on a write
      // action implies view.
      if (action === 'view' && !mod.view) { mod.create = false; mod.edit = false; mod.delete = false }
      if (action !== 'view' && mod[action]) mod.view = true
      return { ...f, permissions: { ...f.permissions, [module]: mod } }
    })
  }
  function toggleModuleAll(module: ModuleName, on: boolean) {
    setForm(f => ({ ...f, permissions: { ...f.permissions, [module]: { view: on, create: on, edit: on, delete: on } } }))
  }

  const filtered = users.filter(u => !search || u.name.toLowerCase().includes(search.toLowerCase()) || (u.email ?? '').toLowerCase().includes(search.toLowerCase()) || (u.city ?? '').toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">All Users</h1>
          <p className="text-sm text-gray-500 mt-0.5">{users.length} users · access is per-user</p>
        </div>
        <button onClick={() => { setShowForm(true); setForm(emptyForm()); setEditId(null); setError('') }} className="btn-primary text-xs px-4 py-2">+ Add User</button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap gap-2">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..." className="flex-1 min-w-[160px] max-w-xs border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400">
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="viewer">Standard user</option>
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
                <th className="text-left px-4 py-2.5 font-medium">Access</th>
                <th className="text-left px-4 py-2.5 font-medium">City</th>
                <th className="text-left px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(u => {
                const access = (u.role ?? u.access_level) === 'admin' ? 'admin' : 'user'
                return (
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
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded capitalize ${roleBadge[access] ?? 'bg-gray-100 text-gray-600'}`}>{access === 'admin' ? 'Admin' : 'Standard'}</span>
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
              )})}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 my-8">
            <h2 className="text-base font-bold text-gray-900 mb-4">{editId ? 'Edit' : 'Add'} User</h2>
            {error && <div className="mb-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
                  <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
                  <input type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
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
                  <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400">
                    {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {editId ? 'Reset password' : 'Password'}
                    <span className="text-gray-400 font-normal"> {editId ? '(leave blank to keep current)' : '(optional — user sets one on first login if blank)'}</span>
                  </label>
                  <input type="password" value={form.password} autoComplete="new-password"
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder={editId ? 'New password' : 'At least 8 characters'}
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
                </div>
              </div>

              {/* Full admin toggle */}
              <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50 cursor-pointer">
                <input type="checkbox" checked={form.isAdmin} onChange={e => setForm(f => ({ ...f, isAdmin: e.target.checked }))} className="mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">Full administrator access</p>
                  <p className="text-xs text-gray-500 mt-0.5">Grants every module, user management, Masters and all admin-only boards. Leave off to grant specific permissions below.</p>
                </div>
              </label>

              {/* Granular per-user permission matrix */}
              {!form.isAdmin && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
                    <p className="text-xs font-semibold text-gray-700">Module permissions</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">Pick exactly what this user can do. View is required for create/edit/delete.</p>
                  </div>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-[10px] uppercase text-gray-400 border-b border-gray-100">
                        <th className="text-left px-3 py-2 font-medium">Module</th>
                        {ACTIONS.map(a => <th key={a} className="px-2 py-2 font-medium text-center">{a}</th>)}
                        <th className="px-2 py-2 font-medium text-center">All</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {MODULES.map(m => {
                        const mod = form.permissions[m]
                        const allOn = mod.view && mod.create && mod.edit && mod.delete
                        return (
                          <tr key={m}>
                            <td className="px-3 py-2 font-medium text-gray-700">{MODULE_LABELS[m]}</td>
                            {ACTIONS.map(a => (
                              <td key={a} className="px-2 py-2 text-center">
                                <input type="checkbox" checked={mod[a]} onChange={() => togglePerm(m, a)} />
                              </td>
                            ))}
                            <td className="px-2 py-2 text-center">
                              <input type="checkbox" checked={allOn} onChange={e => toggleModuleAll(m, e.target.checked)} />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400 resize-none" />
              </div>

              <div className="flex gap-2 justify-end pt-1">
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

export default function AllUsersPage() {
  return <Gate admin><AllUsersInner /></Gate>
}
