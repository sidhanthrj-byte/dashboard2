'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'

function fmtINR(n: number) { return '₹' + Math.round(n).toLocaleString('en-IN') }
function fmtDate(s: string) { return s ? new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—' }

interface Project {
  id: string; name: string; client_name: string; client_phone: string; client_email: string
  site_address: string; status: string; contract_value: number; priority: string
  start_date: string; end_date: string; assigned_to: string; notes: string; created_at: string
}
interface Payment { id: string; type: string; amount: number; payment_date: string; method: string; reference: string; notes: string }
interface Expense { id: string; category: string; description: string; amount: number; expense_date: string; paid_to: string; notes: string }
interface Checklist { id: string; phase: string; item: string; done: number; done_by: string; done_at: string; sort_order: number }
interface Update { id: string; note: string; status: string; created_at: string; created_by: string }

const TABS = ['Overview', 'Payments', 'Checklist', 'Updates']
const PAYMENT_METHODS = ['bank_transfer', 'cash', 'cheque', 'upi', 'card', 'other']
const EXPENSE_CATEGORIES = ['materials', 'labour', 'transport', 'tools', 'subcontract', 'other']
const PHASES = ['pre-install', 'install', 'post-install']

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [project, setProject] = useState<Project | null>(null)
  const [tab, setTab] = useState('Overview')
  const [payments, setPayments] = useState<Payment[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [contractValue, setContractValue] = useState(0)
  const [totalPaid, setTotalPaid] = useState(0)
  const [totalExpenses, setTotalExpenses] = useState(0)
  const [checklist, setChecklist] = useState<Checklist[]>([])
  const [updates, setUpdates] = useState<Update[]>([])
  const [loading, setLoading] = useState(true)

  const [showPayModal, setShowPayModal] = useState(false)
  const [payForm, setPayForm] = useState({ type: 'payment', amount: '', payment_date: new Date().toISOString().slice(0, 10), method: 'bank_transfer', reference: '', notes: '' })
  const [showExpModal, setShowExpModal] = useState(false)
  const [expForm, setExpForm] = useState({ category: 'materials', description: '', amount: '', expense_date: new Date().toISOString().slice(0, 10), paid_to: '', notes: '' })
  const [updateNote, setUpdateNote] = useState('')
  const [saving, setSaving] = useState(false)

  const loadProject = useCallback(async () => {
    const r = await fetch(`/api/projects/${id}`)
    const data = await r.json()
    const { materials: _m, updates: upd, ...proj } = data
    setProject(proj)
    setUpdates(upd || [])
    setLoading(false)
  }, [id])

  const loadPayments = useCallback(async () => {
    const r = await fetch(`/api/projects/${id}/payments`)
    const data = await r.json()
    setPayments(data.payments || [])
    setExpenses(data.expenses || [])
    setContractValue(data.contractValue || 0)
    setTotalPaid(data.totalPaid || 0)
    setTotalExpenses(data.totalExpenses || 0)
  }, [id])

  const loadChecklist = useCallback(async () => {
    const r = await fetch(`/api/projects/${id}/checklist`)
    const data = await r.json()
    setChecklist(data)
  }, [id])

  useEffect(() => {
    loadProject()
    loadPayments()
    loadChecklist()
  }, [loadProject, loadPayments, loadChecklist])

  const addPayment = async () => {
    setSaving(true)
    await fetch(`/api/projects/${id}/payments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payForm, amount: Number(payForm.amount) }) })
    setSaving(false)
    setShowPayModal(false)
    setPayForm({ type: 'payment', amount: '', payment_date: new Date().toISOString().slice(0, 10), method: 'bank_transfer', reference: '', notes: '' })
    loadPayments()
  }

  const addExpense = async () => {
    setSaving(true)
    await fetch(`/api/projects/${id}/expenses`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...expForm, amount: Number(expForm.amount) }) })
    setSaving(false)
    setShowExpModal(false)
    setExpForm({ category: 'materials', description: '', amount: '', expense_date: new Date().toISOString().slice(0, 10), paid_to: '', notes: '' })
    loadPayments()
  }

  const deleteExpense = async (expId: string) => {
    await fetch(`/api/projects/${id}/expenses`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expense_id: expId }) })
    loadPayments()
  }

  const toggleChecklist = async (itemId: string, done: boolean) => {
    await fetch(`/api/projects/${id}/checklist`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ item_id: itemId, done }) })
    loadChecklist()
  }

  const addUpdate = async () => {
    if (!updateNote.trim()) return
    setSaving(true)
    await fetch(`/api/projects/${id}/updates`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ note: updateNote }) })
    setSaving(false)
    setUpdateNote('')
    loadProject()
  }

  if (loading) return <div className="space-y-4">{[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}</div>
  if (!project) return <div className="text-center py-16 text-gray-400">Project not found</div>

  const statusColors: Record<string, string> = {
    scheduled: 'bg-blue-100 text-blue-700', in_progress: 'bg-orange-100 text-orange-700',
    completed: 'bg-green-100 text-green-700', invoiced: 'bg-purple-100 text-purple-700'
  }
  const profit = contractValue - totalExpenses
  const profitPct = contractValue > 0 ? (profit / contractValue) * 100 : 0
  const checkDone = checklist.filter(c => c.done).length

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <a href="/projects" className="text-sm text-gray-500 hover:text-gray-900">← Projects</a>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-gray-900">{project.name}</h1>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[project.status] || 'bg-gray-100 text-gray-600'}`}>{project.status?.replace('_', ' ')}</span>
            </div>
            <p className="text-gray-500 mt-1">{project.client_name}</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">{fmtINR(contractValue)}</div>
            <div className="text-xs text-gray-500">Contract Value</div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-100">
          <div className="bg-green-50 rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-green-700">{fmtINR(totalPaid)}</div>
            <div className="text-xs text-gray-500 mt-1">Received</div>
          </div>
          <div className="bg-red-50 rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-red-600">{fmtINR(contractValue - totalPaid)}</div>
            <div className="text-xs text-gray-500 mt-1">Outstanding</div>
          </div>
          <div className="bg-orange-50 rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-orange-600">{fmtINR(totalExpenses)}</div>
            <div className="text-xs text-gray-500 mt-1">Expenses</div>
          </div>
          <div className={`rounded-xl p-3 text-center ${profit >= 0 ? 'bg-blue-50' : 'bg-red-50'}`}>
            <div className={`text-lg font-bold ${profit >= 0 ? 'text-blue-700' : 'text-red-600'}`}>{fmtINR(profit)} <span className="text-sm">({profitPct.toFixed(0)}%)</span></div>
            <div className="text-xs text-gray-500 mt-1">Gross Profit</div>
          </div>
        </div>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 text-sm py-2 rounded-lg font-medium transition-colors ${tab === t ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>{t}</button>
        ))}
      </div>

      {tab === 'Overview' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {project.client_phone && <div><div className="text-xs text-gray-500 mb-1">Phone</div><div className="font-medium">{project.client_phone}</div></div>}
            {project.client_email && <div><div className="text-xs text-gray-500 mb-1">Email</div><div className="font-medium break-all">{project.client_email}</div></div>}
            {project.site_address && <div className="col-span-2"><div className="text-xs text-gray-500 mb-1">Site</div><div className="font-medium">{project.site_address}</div></div>}
            {project.start_date && <div><div className="text-xs text-gray-500 mb-1">Start</div><div className="font-medium">{fmtDate(project.start_date)}</div></div>}
            {project.end_date && <div><div className="text-xs text-gray-500 mb-1">End</div><div className="font-medium">{fmtDate(project.end_date)}</div></div>}
            {project.assigned_to && <div><div className="text-xs text-gray-500 mb-1">Assigned</div><div className="font-medium">{project.assigned_to}</div></div>}
          </div>
          {project.notes && <div className="p-3 bg-gray-50 rounded-lg"><div className="text-xs text-gray-500 mb-1">Notes</div><p className="text-sm text-gray-700">{project.notes}</p></div>}
          <div className="pt-2">
            <div className="text-xs text-gray-500 mb-2">Checklist Progress</div>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-gray-100 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${checklist.length ? (checkDone / checklist.length) * 100 : 0}%` }} />
              </div>
              <span className="text-sm font-medium text-gray-700">{checkDone}/{checklist.length}</span>
            </div>
          </div>
        </div>
      )}

      {tab === 'Payments' && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <button onClick={() => setShowPayModal(true)} className="btn-primary text-sm px-4 py-2">+ Add Payment</button>
            <button onClick={() => setShowExpModal(true)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">+ Add Expense</button>
          </div>

          {payments.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 font-semibold text-sm text-gray-900">Payments Received</div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium text-gray-600 text-xs">Date</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-600 text-xs">Type</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-600 text-xs">Method</th>
                    <th className="text-right px-4 py-2 font-medium text-gray-600 text-xs">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {payments.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 text-gray-500">{fmtDate(p.payment_date)}</td>
                      <td className="px-4 py-2.5 capitalize text-gray-700">{p.type}</td>
                      <td className="px-4 py-2.5 text-gray-500 capitalize">{p.method?.replace('_', ' ')}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-green-700">{fmtINR(Number(p.amount))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {expenses.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 font-semibold text-sm text-gray-900">Expenses</div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium text-gray-600 text-xs">Date</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-600 text-xs">Description</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-600 text-xs">Category</th>
                    <th className="text-right px-4 py-2 font-medium text-gray-600 text-xs">Amount</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {expenses.map(e => (
                    <tr key={e.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 text-gray-500">{fmtDate(e.expense_date)}</td>
                      <td className="px-4 py-2.5 text-gray-700">{e.description}</td>
                      <td className="px-4 py-2.5 text-gray-500 capitalize">{e.category}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-red-600">{fmtINR(Number(e.amount))}</td>
                      <td className="px-4 py-2.5">
                        <button onClick={() => deleteExpense(e.id)} className="text-xs text-red-400 hover:text-red-600">×</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {payments.length === 0 && expenses.length === 0 && (
            <div className="text-center py-12 text-gray-400">No payments or expenses recorded yet</div>
          )}
        </div>
      )}

      {tab === 'Checklist' && (
        <div className="space-y-4">
          {PHASES.map(phase => {
            const items = checklist.filter(c => c.phase === phase).sort((a, b) => a.sort_order - b.sort_order)
            const done = items.filter(c => c.done).length
            return (
              <div key={phase} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <span className="font-semibold text-sm text-gray-900 capitalize">{phase.replace('-', ' ')}</span>
                  <span className="text-xs text-gray-500">{done}/{items.length}</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {items.map(item => (
                    <label key={item.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!item.done}
                        onChange={e => toggleChecklist(item.id, e.target.checked)}
                        className="w-4 h-4 rounded accent-gray-900"
                      />
                      <span className={`text-sm ${item.done ? 'line-through text-gray-400' : 'text-gray-700'}`}>{item.item}</span>
                      {item.done && item.done_at && <span className="ml-auto text-xs text-gray-400">{fmtDate(item.done_at)}</span>}
                    </label>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {tab === 'Updates' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <textarea
              value={updateNote}
              onChange={e => setUpdateNote(e.target.value)}
              placeholder="Add a progress note..."
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
            <button onClick={addUpdate} disabled={saving || !updateNote.trim()} className="mt-2 btn-primary text-sm px-4 py-2 disabled:opacity-50">
              {saving ? 'Adding...' : 'Add Note'}
            </button>
          </div>
          <div className="space-y-3">
            {updates.map(u => (
              <div key={u.id} className="bg-white rounded-xl border border-gray-100 p-4">
                <p className="text-sm text-gray-700">{u.note}</p>
                <div className="text-xs text-gray-400 mt-2">{fmtDate(u.created_at)}{u.created_by ? ` · ${u.created_by}` : ''}</div>
              </div>
            ))}
            {updates.length === 0 && <div className="text-center py-8 text-gray-400 text-sm">No updates yet</div>}
          </div>
        </div>
      )}

      {showPayModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Add Payment</h2>
              <button onClick={() => setShowPayModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                  <select value={payForm.type} onChange={e => setPayForm(f => ({ ...f, type: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                    <option value="payment">Payment</option>
                    <option value="advance">Advance</option>
                    <option value="final">Final Payment</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Amount (₹)</label>
                  <input type="number" value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="0" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
                  <input type="date" value={payForm.payment_date} onChange={e => setPayForm(f => ({ ...f, payment_date: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Method</label>
                  <select value={payForm.method} onChange={e => setPayForm(f => ({ ...f, method: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                    {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Reference</label>
                  <input value={payForm.reference} onChange={e => setPayForm(f => ({ ...f, reference: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="UTR / Cheque no." />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                  <input value={payForm.notes} onChange={e => setPayForm(f => ({ ...f, notes: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setShowPayModal(false)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              <button onClick={addPayment} disabled={saving || !payForm.amount} className="btn-primary text-sm px-4 py-2 disabled:opacity-50">{saving ? 'Saving...' : 'Add Payment'}</button>
            </div>
          </div>
        </div>
      )}

      {showExpModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Add Expense</h2>
              <button onClick={() => setShowExpModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                  <select value={expForm.category} onChange={e => setExpForm(f => ({ ...f, category: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                    {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Amount (₹)</label>
                  <input type="number" value={expForm.amount} onChange={e => setExpForm(f => ({ ...f, amount: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="0" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Description *</label>
                  <input value={expForm.description} onChange={e => setExpForm(f => ({ ...f, description: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
                  <input type="date" value={expForm.expense_date} onChange={e => setExpForm(f => ({ ...f, expense_date: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Paid To</label>
                  <input value={expForm.paid_to} onChange={e => setExpForm(f => ({ ...f, paid_to: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setShowExpModal(false)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              <button onClick={addExpense} disabled={saving || !expForm.description || !expForm.amount} className="btn-primary text-sm px-4 py-2 disabled:opacity-50">{saving ? 'Saving...' : 'Add Expense'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
