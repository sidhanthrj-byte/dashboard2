'use client'
import { useEffect, useState } from 'react'

interface Movement {
  id: string; product_id: string; product_name: string; movement_type: string
  quantity: number; reference_type: string; reference_id: string; notes: string; movement_date: string
}
interface Product { id: string; name: string; unit: string }

const emptyForm = () => ({ product_id: '', product_name: '', movement_type: 'IN', quantity: 1, reference_type: '', reference_id: '', notes: '', movement_date: new Date().toISOString().slice(0,10) })

export default function MovementsPage() {
  const [movements, setMovements] = useState<Movement[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [filterType, setFilterType] = useState('')
  const [filterProduct, setFilterProduct] = useState('')

  function load() {
    Promise.all([
      fetch('/api/inventory/movements').then(r => r.json()),
      fetch('/api/inventory/products').then(r => r.json()),
    ]).then(([m, p]) => { setMovements(m); setProducts(p); setLoading(false) })
  }
  useEffect(() => { load() }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const prod = products.find(p => p.id === form.product_id)
    await fetch('/api/inventory/movements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, product_name: prod?.name ?? form.product_name }),
    })
    // Update product stock
    if (prod) {
      const stockRes = await fetch(`/api/inventory/products/${form.product_id}`).then(r => r.json())
      const current = Number(stockRes.current_stock ?? 0)
      const newStock = form.movement_type === 'IN' ? current + Number(form.quantity) : current - Number(form.quantity)
      await fetch(`/api/inventory/products/${form.product_id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...stockRes, current_stock: newStock }),
      })
    }
    setShowForm(false); setForm(emptyForm()); load()
  }

  const filtered = movements.filter(m => {
    if (filterType && m.movement_type !== filterType) return false
    if (filterProduct && m.product_id !== filterProduct) return false
    return true
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Stock Movements</h1>
          <p className="text-sm text-gray-500 mt-0.5">{movements.length} total movements</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary text-xs px-4 py-2">+ Record Movement</button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-100 flex gap-3">
          <select value={filterProduct} onChange={e => setFilterProduct(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-emerald-400">
            <option value="">All Products</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-emerald-400">
            <option value="">All Types</option>
            <option value="IN">IN</option>
            <option value="OUT">OUT</option>
          </select>
        </div>
        {loading ? (
          <p className="text-sm text-gray-400 text-center py-12">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">No movements found</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100">
                <th className="text-left px-4 py-2.5 font-medium">Date</th>
                <th className="text-left px-4 py-2.5 font-medium">Product</th>
                <th className="text-left px-4 py-2.5 font-medium">Type</th>
                <th className="text-right px-4 py-2.5 font-medium">Qty</th>
                <th className="text-left px-4 py-2.5 font-medium">Reference</th>
                <th className="text-left px-4 py-2.5 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(m => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600">{String(m.movement_date).slice(0,10)}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{m.product_name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${m.movement_type === 'IN' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
                      {m.movement_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">{m.quantity}</td>
                  <td className="px-4 py-3 text-gray-600">{m.reference_type ? `${m.reference_type}${m.reference_id ? ` #${m.reference_id}` : ''}` : '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{m.notes ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-base font-bold text-gray-900 mb-4">Record Stock Movement</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Product *</label>
                <select required value={form.product_id} onChange={e => setForm(f => ({ ...f, product_id: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-emerald-400">
                  <option value="">Select product</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Type *</label>
                  <select value={form.movement_type} onChange={e => setForm(f => ({ ...f, movement_type: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-emerald-400">
                    <option value="IN">IN (Stock In)</option>
                    <option value="OUT">OUT (Stock Out)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Quantity *</label>
                  <input type="number" required min="0" step="any" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: Number(e.target.value) }))} className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-emerald-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Date *</label>
                  <input type="date" required value={form.movement_date} onChange={e => setForm(f => ({ ...f, movement_date: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-emerald-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Reference Type</label>
                  <input placeholder="e.g. Purchase, Sale" value={form.reference_type} onChange={e => setForm(f => ({ ...f, reference_type: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-emerald-400" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-emerald-400 resize-none" />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => { setShowForm(false); setForm(emptyForm()) }} className="btn-secondary text-xs px-4 py-2">Cancel</button>
                <button type="submit" className="btn-primary text-xs px-4 py-2">Record</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
