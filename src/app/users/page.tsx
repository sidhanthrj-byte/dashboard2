'use client'
import { useEffect, useState } from 'react'

interface User {
  id: string; name: string; email: string; phone: string; city: string
  access_level: string; status: string; created_at: string; last_login: string
}

export default function UsersDashboard() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/users').then(r => r.json()).then(d => { setUsers(d); setLoading(false) })
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Loading...</div>

  const active = users.filter(u => u.status === 'active').length
  const inactive = users.filter(u => u.status !== 'active').length
  const now = new Date()
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const addedThisMonth = users.filter(u => (u.created_at ?? '').startsWith(thisMonth)).length

  const byRole: Record<string, number> = {}
  const byCity: Record<string, number> = {}
  for (const u of users) {
    const r = u.access_level ?? 'viewer'
    byRole[r] = (byRole[r] ?? 0) + 1
    const c = u.city ?? 'Unknown'
    byCity[c] = (byCity[c] ?? 0) + 1
  }

  const roleColors: Record<string, string> = {
    admin: 'bg-red-500', manager: 'bg-blue-500', editor: 'bg-emerald-500', viewer: 'bg-gray-400'
  }

  const statCards = [
    { label: 'Total Users', value: users.length, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Active', value: active, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Inactive', value: inactive, color: 'text-gray-500', bg: 'bg-gray-100' },
    { label: 'Added This Month', value: addedThisMonth, color: 'text-violet-600', bg: 'bg-violet-50' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Users Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Team members and access management</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(c => (
          <div key={c.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className={`inline-flex items-center justify-center w-9 h-9 rounded-lg ${c.bg} mb-3`}>
              <span className={`text-sm font-bold ${c.color}`}>{c.value}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{c.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Users by Role</h2>
          <div className="space-y-3">
            {Object.entries(byRole).sort((a, b) => b[1] - a[1]).map(([role, count]) => (
              <div key={role}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium text-gray-700 capitalize">{role}</span>
                  <span className="text-gray-500">{count}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${roleColors[role] ?? 'bg-gray-400'}`} style={{ width: `${(count / users.length) * 100}%` }} />
                </div>
              </div>
            ))}
            {Object.keys(byRole).length === 0 && <p className="text-xs text-gray-400">No users yet</p>}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Users by City</h2>
          <div className="space-y-3">
            {Object.entries(byCity).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([city, count]) => (
              <div key={city}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium text-gray-700">{city}</span>
                  <span className="text-gray-500">{count}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-blue-500" style={{ width: `${(count / users.length) * 100}%` }} />
                </div>
              </div>
            ))}
            {Object.keys(byCity).length === 0 && <p className="text-xs text-gray-400">No users yet</p>}
          </div>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-amber-900">Import data from Airtable</p>
          <p className="text-xs text-amber-700 mt-0.5">Sync inventory products, suppliers and clients from your Airtable workspace</p>
        </div>
        <a href="/admin/import" className="bg-amber-600 hover:bg-amber-700 text-white text-sm px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap">Open Import →</a>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">User Directory</h2>
          <a href="/users/all" className="text-xs text-blue-600 hover:underline">View all →</a>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {users.slice(0, 9).map(u => (
            <div key={u.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-gray-200">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-blue-700">{u.name.charAt(0).toUpperCase()}</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{u.name}</p>
                <p className="text-xs text-gray-500 truncate">{u.city ?? '—'} · {u.access_level}</p>
              </div>
            </div>
          ))}
          {users.length === 0 && <p className="text-sm text-gray-400 col-span-3 text-center py-8">No users yet. <a href="/users/all" className="text-blue-600 hover:underline">Add users</a></p>}
        </div>
      </div>
    </div>
  )
}
