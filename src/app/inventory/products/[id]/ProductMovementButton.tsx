'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ProductMovementButton({ productId, productName }: { productId: string; productName: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ movement_type: 'IN', quantity: 0, reference_type: 'manual', notes: '' })

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  async function save() {
    setSaving(true)
    await fetch('/api/inventory/movements', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, product_id: productId, product_name: productName, quantity: Number(form.quantity) }),
    })
    setSaving(false); setOpen(false)
    setForm({ movement_type: 'IN', quantity: 0, reference_type: 'manual', notes: '' })
    router.refresh()
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary text-xs px-4 py-2">+ Record Movement</button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Record Movement</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="label">Type</label>
                <select value={form.movement_type} onChange={e => setForm(f => ({ ...f, movement_type: e.target.value }))} className="input w-full">
                  <option value="IN">IN (Stock added)</option>
                  <option value="OUT">OUT (Stock used)</option>
                </select>
              </div>
              <div>
                <label className="label">Quantity</label>
                <input type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: parseFloat(e.target.value) || 0 }))} className="input w-full" />
              </div>
              <div>
                <label className="label">Reference</label>
                <input value={form.reference_type} onChange={e => setForm(f => ({ ...f, reference_type: e.target.value }))} className="input w-full" />
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="input w-full h-20 resize-none" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setOpen(false)} className="btn-secondary text-sm px-4 py-2">Cancel</button>
              <button onClick={save} disabled={saving || form.quantity <= 0} className="btn-primary text-sm px-5 py-2 disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
