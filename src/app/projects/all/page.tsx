'use client'
import { useEffect, useState, useCallback } from 'react'

type Project = {
  id: string; name: string; client_name: string; client_phone: string; client_email: string;
  site_address: string; city: string; status: string; scheduled_date: string; completion_date: string;
  team_lead: string; team_members: string; ceiling_area_sqft: number; contract_value: number;
  priority: string; notes: string; quote_id: string;
}

const STATUSES = ['scheduled','in_progress','completed','invoiced','cancelled']
const STATUS_LABELS: Record<string, string> = { scheduled:'Scheduled', in_progress:'In Progress', completed:'Completed', invoiced:'Invoiced', cancelled:'Cancelled' }
const STATUS_COLORS: Record<string, string> = { scheduled:'bg-blue-100 text-blue-700', in_progress:'bg-amber-100 text-amber-700', completed:'bg-green-100 text-green-700', invoiced:'bg-purple-100 text-purple-700', cancelled:'bg-gray-100 text-gray-500' }
const PRIORITIES = ['urgent','high','normal','low']
const PRIORITY_COLORS: Record<string, string> = { urgent:'text-red-600', high:'text-orange-500', normal:'text-blue-600', low:'text-gray-400' }

function fmt(n: number) { return '₹' + n.toLocaleString('en-IN') }
function fmtDate(s: string) { if (!s) return '—'; return new Date(s).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) }

const EMPTY: Project = { id:'', name:'', client_name:'', client_phone:'', client_email:'', site_address:'', city:'', status:'scheduled', scheduled_date:'', completion_date:'', team_lead:'', team_members:'', ceiling_area_sqft:0, contract_value:0, priority:'normal', notes:'', quote_id:'' }

export default function AllProjects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<Project>(EMPTY)
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    fetch('/api/projects').then(r=>r.json()).then(d=>{setProjects(d);setLoading(false)}).catch(()=>setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowModal(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const filtered = projects.filter(p => {
    const q = search.toLowerCase()
    const matchSearch = !q || p.name.toLowerCase().includes(q) || p.client_name.toLowerCase().includes(q) || p.city?.toLowerCase().includes(q)
    const matchStatus = filterStatus === 'all' || p.status === filterStatus
    return matchSearch && matchStatus
  })

  async function save() {
    setSaving(true)
    const method = form.id ? 'PUT' : 'POST'
    const url = form.id ? `/api/projects/${form.id}` : '/api/projects'
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setSaving(false); setShowModal(false); load()
  }

  async function del(id: string) {
    if (!confirm('Delete this project?')) return
    await fetch(`/api/projects/${id}`, { method: 'DELETE' })
    load()
  }

  function openEdit(p: Project) { setForm(p); setShowModal(true) }
  function openNew() { setForm({ ...EMPTY, scheduled_date: new Date().toISOString().slice(0,10) }); setShowModal(true) }
  function set(k: keyof Project, v: string | number) { setForm(f => ({ ...f, [k]: v })) }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">All Projects</h1>
        <button onClick={openNew} className="btn-primary text-xs px-4 py-2">+ New Project</button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, client, city…" className="input flex-1 min-w-48" />
        <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} className="input w-44">
          <option value="all">All Status</option>
          {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left text-xs text-gray-500">
                <th className="px-4 py-3 font-semibold">Project</th>
                <th className="px-4 py-3 font-semibold">Client</th>
                <th className="px-4 py-3 font-semibold">City</th>
                <th className="px-4 py-3 font-semibold">Area</th>
                <th className="px-4 py-3 font-semibold">Value</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Team Lead</th>
                <th className="px-4 py-3 font-semibold">Priority</th>
                <th className="px-4 py-3 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-400 text-xs">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={10} className="px-4 py-12 text-center text-gray-400">
                  <p className="text-3xl mb-2">🏗️</p>
                  <p className="font-medium">No projects yet</p>
                  <p className="text-xs mt-1">Create your first project to get started</p>
                </td></tr>
              ) : filtered.map(p => (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                  <td className="px-4 py-3 text-gray-600">{p.client_name}</td>
                  <td className="px-4 py-3 text-gray-500">{p.city || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{p.ceiling_area_sqft > 0 ? `${p.ceiling_area_sqft} sqft` : '—'}</td>
                  <td className="px-4 py-3 text-gray-900 font-medium">{p.contract_value > 0 ? fmt(p.contract_value) : '—'}</td>
                  <td className="px-4 py-3"><span className={`badge ${STATUS_COLORS[p.status] ?? 'bg-gray-100 text-gray-600'}`}>{STATUS_LABELS[p.status] ?? p.status}</span></td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{fmtDate(p.scheduled_date)}</td>
                  <td className="px-4 py-3 text-gray-600">{p.team_lead || '—'}</td>
                  <td className="px-4 py-3"><span className={`text-xs font-semibold capitalize ${PRIORITY_COLORS[p.priority] ?? ''}`}>{p.priority}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(p)} className="text-xs text-blue-600 hover:underline">Edit</button>
                      <button onClick={() => del(p.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">{form.id ? 'Edit Project' : 'New Project'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="label">Project Name *</label>
                <input value={form.name} onChange={e=>set('name',e.target.value)} className="input w-full" placeholder="e.g. ABC Office Ceiling" />
              </div>
              <div>
                <label className="label">Client Name *</label>
                <input value={form.client_name} onChange={e=>set('client_name',e.target.value)} className="input w-full" />
              </div>
              <div>
                <label className="label">Client Phone</label>
                <input value={form.client_phone} onChange={e=>set('client_phone',e.target.value)} className="input w-full" />
              </div>
              <div>
                <label className="label">Client Email</label>
                <input value={form.client_email} onChange={e=>set('client_email',e.target.value)} className="input w-full" />
              </div>
              <div>
                <label className="label">City</label>
                <input value={form.city} onChange={e=>set('city',e.target.value)} className="input w-full" />
              </div>
              <div className="col-span-2">
                <label className="label">Site Address</label>
                <input value={form.site_address} onChange={e=>set('site_address',e.target.value)} className="input w-full" />
              </div>
              <div>
                <label className="label">Status</label>
                <select value={form.status} onChange={e=>set('status',e.target.value)} className="input w-full">
                  {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Priority</label>
                <select value={form.priority} onChange={e=>set('priority',e.target.value)} className="input w-full">
                  {PRIORITIES.map(p => <option key={p} value={p} className="capitalize">{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Scheduled Date</label>
                <input type="date" value={form.scheduled_date} onChange={e=>set('scheduled_date',e.target.value)} className="input w-full" />
              </div>
              <div>
                <label className="label">Completion Date</label>
                <input type="date" value={form.completion_date} onChange={e=>set('completion_date',e.target.value)} className="input w-full" />
              </div>
              <div>
                <label className="label">Team Lead</label>
                <input value={form.team_lead} onChange={e=>set('team_lead',e.target.value)} className="input w-full" />
              </div>
              <div>
                <label className="label">Team Members (comma separated)</label>
                <input value={form.team_members} onChange={e=>set('team_members',e.target.value)} className="input w-full" placeholder="e.g. Ravi, Suresh" />
              </div>
              <div>
                <label className="label">Ceiling Area (sqft)</label>
                <input type="number" value={form.ceiling_area_sqft} onChange={e=>set('ceiling_area_sqft',parseFloat(e.target.value)||0)} className="input w-full" />
              </div>
              <div>
                <label className="label">Contract Value (₹)</label>
                <input type="number" value={form.contract_value} onChange={e=>set('contract_value',parseFloat(e.target.value)||0)} className="input w-full" />
              </div>
              <div className="col-span-2">
                <label className="label">Notes</label>
                <textarea value={form.notes} onChange={e=>set('notes',e.target.value)} className="input w-full h-20 resize-none" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="btn-secondary text-sm px-4 py-2">Cancel</button>
              <button onClick={save} disabled={saving || !form.name || !form.client_name} className="btn-primary text-sm px-5 py-2 disabled:opacity-50">{saving ? 'Saving…' : 'Save Project'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
