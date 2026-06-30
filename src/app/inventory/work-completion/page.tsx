'use client'
import { useEffect, useState } from 'react'

interface WorkCompletion {
  id: string; project_name: string; client_name: string; location: string
  completion_date: string; status: string; amount: number; notes: string
}
const emptyForm = () => ({ project_name: '', client_name: '', location: '', completion_date: new Date().toISOString().slice(0,10), status: 'completed', amount: 0, notes: '' })

export default function WorkCompletionPage() {
  const [jobs, setJobs] = useState<WorkCompletion[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [editId, setEditId] = useState<string | null>(null)

  function load() {
    fetch('/api/inventory/work-completions').then(r => r.json()).then(d => { setJobs(d); setLoading(false) })
  }
  useEffect(() => { load() }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (editId) {
      await fetch(`/api/inventory/work-completions/${editId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    } else {
      await fetch('/api/inventory/work-completions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    }
    setShowForm(false); setForm(emptyForm()); setEditId(null); load()
  }
  async function handleDelete(id: string) {
    if (!confirm('Delete job record?')) return
    await fetch(`/api/inventory/work-completions/${id}`, { method: 'DELETE' }); load()
  }
  function openEdit(j: WorkCompletion) {
    setForm({ project_name: j.project_name, client_name: j.client_name ?? '', location: j.location ?? '', completion_date: j.completion_date ?? '', status: j.status ?? 'completed', amount: j.amount ?? 0, notes: j.notes ?? '' })
    setEditId(j.id); setShowForm(true)
  }

  const statusColors: Record<string, string> = {
    completed: 'bg-emerald-50 text-emerald-700',
    in_progress: 'bg-blue-50 text-blue-700',
    pending: 'bg-amber-50 text-amber-700',
    cancelled: 'bg-gray-100 text-gray-500',
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Work Completions</h1>
          <p className="text-sm text-gray-500 mt-0.5">{jobs.length} job records</p>
        </div>
        <button onClick={() => { setShowForm(true); setForm(emptyForm()); setEditId(null) }} className="btn-primary text-xs px-4 py-2">+ Add Job</button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        {loading ? (
          <p className="text-sm text-gray-400 text-center py-12">Loading...</p>
        ) : jobs.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">No job records yet</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100">
                <th className="text-left px-4 py-2.5 font-medium">Date</th>
                <th className="text-left px-4 py-2.5 font-medium">Project</th>
                <th className="text-left px-4 py-2.5 font-medium">Client</th>
                <th className="text-left px-4 py-2.5 font-medium">Location</th>
                <th className="text-right px-4 py-2.5 font-medium">Amount</th>
                <th className="text-left px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {jobs.map(j => (
                <tr key={j.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600">{j.completion_date ?? '—'}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{j.project_name}</td>
                  <td className="px-4 py-3 text-gray-600">{j.client_name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{j.location ?? '—'}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">{j.amount ? `₹${Number(j.amount).toLocaleString('en-IN')}` : '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${statusColors[j.status] ?? 'bg-gray-100 text-gray-500'}`}>{j.status}</span>
                  </td>
                  <td className="px-4 py-3 flex items-center gap-2 justify-end">
                    <button onClick={() => openEdit(j)} className="text-xs text-blue-600 hover:underline">Edit</button>
                    <button onClick={() => handleDelete(j.id)} className="text-xs text-rose-500 hover:underline">Delete</button>
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
            <h2 className="text-base font-bold text-gray-900 mb-4">{editId ? 'Edit' : 'Add'} Job Record</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Project Name *</label>
                  <input required value={form.project_name} onChange={e => setForm(f => ({ ...f, project_name: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-emerald-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Client</label>
                  <input value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-emerald-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Location</label>
                  <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-emerald-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Completion Date</label>
                  <input type="date" value={form.completion_date} onChange={e => setForm(f => ({ ...f, completion_date: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-emerald-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Amount (₹)</label>
                  <input type="number" min="0" step="any" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: Number(e.target.value) }))} className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-emerald-400" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-emerald-400">
                    <option value="completed">Completed</option>
                    <option value="in_progress">In Progress</option>
                    <option value="pending">Pending</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                  <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-emerald-400 resize-none" />
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => { setShowForm(false); setEditId(null) }} className="btn-secondary text-xs px-4 py-2">Cancel</button>
                <button type="submit" className="btn-primary text-xs px-4 py-2">{editId ? 'Save' : 'Add'} Job</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
