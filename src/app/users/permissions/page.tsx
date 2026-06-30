'use client'
import { useEffect, useState, useCallback } from 'react'

const ROLES = ['admin','manager','sales','installer','viewer']
const FEATURES = ['quotes','inventory','projects','analytics','users']
const FEATURE_LABELS: Record<string, string> = { quotes:'Quotations', inventory:'Inventory', projects:'Projects', analytics:'Analytics', users:'User Management' }
const ROLE_LABELS: Record<string, string> = { admin:'Admin', manager:'Manager', sales:'Sales', installer:'Installer', viewer:'Viewer' }
const ROLE_COLORS: Record<string, string> = { admin:'bg-red-100 text-red-700', manager:'bg-blue-100 text-blue-700', sales:'bg-green-100 text-green-700', installer:'bg-orange-100 text-orange-700', viewer:'bg-gray-100 text-gray-600' }

type PermRow = { role: string; feature: string; can_view: number; can_edit: number }

export default function PermissionsPage() {
  const [perms, setPerms] = useState<PermRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const load = useCallback(() => {
    fetch('/api/permissions').then(r=>r.json()).then(d=>{setPerms(d);setLoading(false)})
  }, [])
  useEffect(() => { load() }, [load])

  function getPerm(role: string, feature: string, field: 'can_view' | 'can_edit'): boolean {
    const row = perms.find(p => p.role === role && p.feature === feature)
    return !!(row ? row[field] : 0)
  }

  function toggle(role: string, feature: string, field: 'can_view' | 'can_edit') {
    if (role === 'admin') return // Admin always has full access
    setPerms(prev => {
      const existing = prev.find(p => p.role === role && p.feature === feature)
      if (existing) {
        return prev.map(p => p.role === role && p.feature === feature
          ? { ...p, [field]: p[field] ? 0 : 1 }
          : p)
      }
      return [...prev, { role, feature, can_view: field === 'can_view' ? 1 : 0, can_edit: field === 'can_edit' ? 1 : 0 }]
    })
  }

  async function save() {
    setSaving(true)
    await fetch('/api/permissions', { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(perms) })
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Role Permissions</h1>
          <p className="text-xs text-gray-500 mt-0.5">Control what each role can see and do across the platform</p>
        </div>
        <button onClick={save} disabled={saving} className="btn-primary text-xs px-4 py-2 disabled:opacity-50">
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Changes'}
        </button>
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? <div className="p-8 text-center text-gray-400 text-sm animate-pulse">Loading permissions…</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 w-36">Feature</th>
                  {ROLES.map(r => (
                    <th key={r} className="px-4 py-3 text-center" colSpan={2}>
                      <span className={`badge ${ROLE_COLORS[r]}`}>{ROLE_LABELS[r]}</span>
                    </th>
                  ))}
                </tr>
                <tr className="border-b border-gray-100">
                  <th className="px-4 py-2 text-left text-[11px] text-gray-400 font-normal">—</th>
                  {ROLES.map(r => (
                    <>
                      <th key={`${r}-v`} className="px-3 py-2 text-center text-[10px] text-gray-400 font-semibold">View</th>
                      <th key={`${r}-e`} className="px-3 py-2 text-center text-[10px] text-gray-400 font-semibold">Edit</th>
                    </>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FEATURES.map(feature => (
                  <tr key={feature} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800 text-xs">{FEATURE_LABELS[feature]}</td>
                    {ROLES.map(role => {
                      const isAdmin = role === 'admin'
                      const canView = isAdmin ? true : getPerm(role, feature, 'can_view')
                      const canEdit = isAdmin ? true : getPerm(role, feature, 'can_edit')
                      return (
                        <>
                          <td key={`${role}-${feature}-v`} className="px-3 py-3 text-center">
                            <button onClick={() => toggle(role, feature, 'can_view')} disabled={isAdmin}
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center mx-auto transition-colors ${isAdmin ? 'cursor-not-allowed' : 'cursor-pointer'} ${canView ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-300'}`}>
                              {canView && <span className="text-white text-xs font-bold">✓</span>}
                            </button>
                          </td>
                          <td key={`${role}-${feature}-e`} className="px-3 py-3 text-center">
                            <button onClick={() => toggle(role, feature, 'can_edit')} disabled={isAdmin}
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center mx-auto transition-colors ${isAdmin ? 'cursor-not-allowed' : 'cursor-pointer'} ${canEdit ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300'}`}>
                              {canEdit && <span className="text-white text-xs font-bold">✓</span>}
                            </button>
                          </td>
                        </>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card bg-blue-50 border-blue-100">
        <div className="flex gap-3">
          <span className="text-blue-500">ℹ️</span>
          <div className="text-xs text-blue-700">
            <p className="font-semibold mb-1">How permissions work</p>
            <p>Admin always has full access to everything. Changes here will be applied when users log in. Users without View access won&apos;t see the feature in their navigation. Users without Edit access can view but cannot create or modify data.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
