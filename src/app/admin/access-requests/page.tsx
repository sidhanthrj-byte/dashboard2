'use client'
import Gate from '@/components/Gate'
import { useEffect, useState, useCallback } from 'react'

type Request = {
  id: string; name: string; email: string; phone: string; city: string;
  requested_role: string; reason: string; status: string; created_at: string;
  reviewed_by: string; reviewed_at: string; notes: string;
}

const ROLES = ['viewer','sales','installer','manager','admin']
const ROLE_COLORS: Record<string, string> = { admin:'bg-red-100 text-red-700', manager:'bg-blue-100 text-blue-700', sales:'bg-green-100 text-green-700', installer:'bg-orange-100 text-orange-700', viewer:'bg-gray-100 text-gray-600' }
const STATUS_COLORS: Record<string, string> = { pending:'bg-amber-100 text-amber-700', approved:'bg-green-100 text-green-700', denied:'bg-red-100 text-red-600' }

function fmtDate(s: string) { if (!s) return '—'; return new Date(s).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) }

function AccessRequestsPage() {
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [approving, setApproving] = useState<string | null>(null)
  const [roleOverride, setRoleOverride] = useState<Record<string, string>>({})
  const [denyModal, setDenyModal] = useState<Request | null>(null)
  const [denyNotes, setDenyNotes] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    fetch(`/api/access-requests?status=${filter}`).then(r=>r.json()).then(d=>{setRequests(d);setLoading(false)}).catch(()=>setLoading(false))
  }, [filter])

  useEffect(() => { load() }, [load])

  async function approve(req: Request) {
    setApproving(req.id)
    const role = roleOverride[req.id] ?? req.requested_role
    const res = await fetch(`/api/access-requests/${req.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve', role }),
    })
    if (!res.ok) alert('Failed to approve. Are you logged in as admin?')
    setApproving(null); load()
  }

  async function deny(req: Request) {
    const res = await fetch(`/api/access-requests/${req.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'deny', notes: denyNotes }),
    })
    if (!res.ok) alert('Failed to deny. Are you logged in as admin?')
    setDenyModal(null); setDenyNotes(''); load()
  }

  const pending = requests.filter(r => r.status === 'pending').length

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Access Requests</h1>
          <p className="text-xs text-gray-500 mt-0.5">Review and approve user access requests</p>
        </div>
        {pending > 0 && filter !== 'pending' && (
          <button onClick={() => setFilter('pending')} className="btn-primary text-xs px-3 py-1.5">
            {pending} pending
          </button>
        )}
      </div>

      <div className="flex gap-2">
        {['pending','approved','denied','all'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors capitalize ${filter === s ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {s}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="card text-center py-8 text-gray-400 animate-pulse">Loading…</div>
        ) : requests.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-3xl mb-2">📭</p>
            <p className="font-medium text-gray-500">No {filter !== 'all' ? filter : ''} requests</p>
          </div>
        ) : requests.map(req => (
          <div key={req.id} className={`bg-white rounded-xl border p-4 ${req.status === 'pending' ? 'border-amber-200' : 'border-gray-200'}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-gray-900">{req.name}</p>
                  <span className={`badge ${STATUS_COLORS[req.status] ?? 'bg-gray-100 text-gray-600'}`}>{req.status}</span>
                  <span className={`badge ${ROLE_COLORS[req.requested_role] ?? 'bg-gray-100 text-gray-600'}`}>Wants: {req.requested_role}</span>
                </div>
                <p className="text-xs text-gray-600">{req.email}{req.phone ? ` · ${req.phone}` : ''}{req.city ? ` · ${req.city}` : ''}</p>
                {req.reason && <p className="text-xs text-gray-500 mt-1.5 italic">&ldquo;{req.reason}&rdquo;</p>}
                <p className="text-[11px] text-gray-400 mt-1">Submitted {fmtDate(req.created_at)}</p>
                {req.reviewed_by && <p className="text-[11px] text-gray-400">Reviewed by {req.reviewed_by} · {fmtDate(req.reviewed_at)}</p>}
              </div>

              {req.status === 'pending' && (
                <div className="flex flex-col gap-2 min-w-[160px]">
                  <div>
                    <label className="text-[10px] text-gray-400 uppercase font-semibold">Grant role</label>
                    <select
                      value={roleOverride[req.id] ?? req.requested_role}
                      onChange={e => setRoleOverride(prev => ({ ...prev, [req.id]: e.target.value }))}
                      className="input w-full mt-0.5 text-xs">
                      {ROLES.map(r => <option key={r} value={r} className="capitalize">{r.charAt(0).toUpperCase()+r.slice(1)}</option>)}
                    </select>
                  </div>
                  <button onClick={() => approve(req)} disabled={approving === req.id}
                    className="btn-primary text-xs py-1.5 disabled:opacity-50 w-full">
                    {approving === req.id ? 'Approving…' : '✓ Approve'}
                  </button>
                  <button onClick={() => { setDenyModal(req); setDenyNotes('') }}
                    className="text-xs py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors w-full">
                    ✕ Deny
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {denyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={e => { if (e.target === e.currentTarget) setDenyModal(null) }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h2 className="font-bold text-gray-900 mb-1">Deny Request</h2>
            <p className="text-xs text-gray-500 mb-4">Denying access for <strong>{denyModal.name}</strong> ({denyModal.email})</p>
            <label className="label">Reason (optional)</label>
            <textarea value={denyNotes} onChange={e=>setDenyNotes(e.target.value)} className="input w-full h-20 resize-none mb-4" placeholder="e.g. Not a Pongs team member" />
            <div className="flex gap-2">
              <button onClick={() => setDenyModal(null)} className="btn-secondary flex-1 text-sm py-2">Cancel</button>
              <button onClick={() => deny(denyModal)} className="flex-1 bg-red-600 text-white text-sm py-2 rounded-lg font-medium hover:bg-red-700 transition-colors">Deny</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AccessRequestsPagePage_Guarded() {
  return <Gate admin><AccessRequestsPage /></Gate>
}
