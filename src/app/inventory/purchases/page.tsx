'use client'
import { useEffect, useState } from 'react'

interface Supplier { id: string; name: string }
interface Product { id: string; name: string; unit: string; cost_price: number }
interface PurchaseItem { id?: string; product_id: string; description: string; category: string; quantity: number; unit: string; unit_price: number; total_price: number }
interface Purchase {
  id: string; purchase_number: string; supplier_id: string; supplier_name: string
  purchase_date: string; total_amount: number; status: string; notes: string
  items: PurchaseItem[]
}

const emptyItem = (): PurchaseItem => ({ product_id: '', description: '', category: '', quantity: 1, unit: 'nos', unit_price: 0, total_price: 0 })
const emptyForm = () => ({ purchase_number: '', supplier_id: '', supplier_name: '', purchase_date: new Date().toISOString().slice(0,10), status: 'received', notes: '', items: [emptyItem()] })

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [expanded, setExpanded] = useState<string | null>(null)

  function load() {
    Promise.all([
      fetch('/api/inventory/purchases').then(r => r.json()),
      fetch('/api/inventory/suppliers').then(r => r.json()),
      fetch('/api/inventory/products').then(r => r.json()),
    ]).then(([p, s, pr]) => { setPurchases(p); setSuppliers(s); setProducts(pr); setLoading(false) })
  }
  useEffect(() => { load() }, [])

  function updateItem(idx: number, field: keyof PurchaseItem, value: string | number) {
    setForm(f => {
      const items = [...f.items]
      items[idx] = { ...items[idx], [field]: value }
      if (field === 'quantity' || field === 'unit_price') {
        items[idx].total_price = Number(items[idx].quantity) * Number(items[idx].unit_price)
      }
      if (field === 'product_id') {
        const prod = products.find(p => p.id === value)
        if (prod) { items[idx].description = prod.name; items[idx].unit = prod.unit; items[idx].unit_price = prod.cost_price; items[idx].total_price = Number(items[idx].quantity) * prod.cost_price }
      }
      return { ...f, items }
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const sup = suppliers.find(s => s.id === form.supplier_id)
    await fetch('/api/inventory/purchases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, supplier_name: sup?.name ?? form.supplier_name }),
    })
    setShowForm(false); setForm(emptyForm()); load()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Purchases</h1>
          <p className="text-sm text-gray-500 mt-0.5">{purchases.length} purchase orders</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary text-xs px-4 py-2">+ New Purchase</button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        {loading ? (
          <p className="text-sm text-gray-400 text-center py-12">Loading...</p>
        ) : purchases.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">No purchases yet</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100">
                <th className="text-left px-4 py-2.5 font-medium">Date</th>
                <th className="text-left px-4 py-2.5 font-medium">Purchase #</th>
                <th className="text-left px-4 py-2.5 font-medium">Supplier</th>
                <th className="text-left px-4 py-2.5 font-medium">Items</th>
                <th className="text-right px-4 py-2.5 font-medium">Total</th>
                <th className="text-left px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {purchases.map(p => (
                <>
                  <tr key={p.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setExpanded(expanded === p.id ? null : p.id)}>
                    <td className="px-4 py-3 text-gray-600">{p.purchase_date}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{p.purchase_number}</td>
                    <td className="px-4 py-3 text-gray-600">{p.supplier_name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{(p.items ?? []).length} items</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">₹{Number(p.total_amount).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3"><span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">{p.status}</span></td>
                  </tr>
                  {expanded === p.id && (p.items ?? []).length > 0 && (
                    <tr key={`${p.id}-items`}>
                      <td colSpan={6} className="px-4 py-2 bg-gray-50">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-gray-400">
                              <th className="text-left py-1 font-medium">Product</th>
                              <th className="text-left py-1 font-medium">Qty</th>
                              <th className="text-left py-1 font-medium">Unit Price</th>
                              <th className="text-right py-1 font-medium">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {p.items.map((item, i) => (
                              <tr key={i} className="border-t border-gray-100">
                                <td className="py-1 text-gray-700">{item.description || '—'}</td>
                                <td className="py-1 text-gray-700">{item.quantity} {item.unit}</td>
                                <td className="py-1 text-gray-700">₹{Number(item.unit_price).toLocaleString('en-IN')}</td>
                                <td className="py-1 text-right text-gray-900 font-medium">₹{Number(item.total_price).toLocaleString('en-IN')}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-base font-bold text-gray-900 mb-4">New Purchase</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Purchase # *</label>
                  <input required value={form.purchase_number} onChange={e => setForm(f => ({ ...f, purchase_number: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-emerald-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Date *</label>
                  <input type="date" required value={form.purchase_date} onChange={e => setForm(f => ({ ...f, purchase_date: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-emerald-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Supplier</label>
                  <select value={form.supplier_id} onChange={e => setForm(f => ({ ...f, supplier_id: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-emerald-400">
                    <option value="">Select supplier</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-emerald-400">
                    <option value="received">Received</option>
                    <option value="pending">Pending</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-gray-700">Line Items</label>
                  <button type="button" onClick={() => setForm(f => ({ ...f, items: [...f.items, emptyItem()] }))} className="text-xs text-emerald-600 hover:underline">+ Add Item</button>
                </div>
                <div className="space-y-2">
                  {form.items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-4">
                        <select value={item.product_id} onChange={e => updateItem(idx, 'product_id', e.target.value)} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-emerald-400">
                          <option value="">Select product</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                      <div className="col-span-3">
                        <input placeholder="Description" value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-emerald-400" />
                      </div>
                      <div className="col-span-1">
                        <input type="number" min="0" step="any" placeholder="Qty" value={item.quantity} onChange={e => updateItem(idx, 'quantity', Number(e.target.value))} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-emerald-400" />
                      </div>
                      <div className="col-span-2">
                        <input type="number" min="0" step="any" placeholder="Unit price" value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', Number(e.target.value))} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-emerald-400" />
                      </div>
                      <div className="col-span-1 text-xs text-gray-500 pb-1.5 text-right">
                        ₹{Number(item.total_price).toLocaleString('en-IN')}
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <button type="button" onClick={() => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))} className="text-rose-400 hover:text-rose-600 text-xs pb-1.5">✕</button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-right text-sm font-semibold text-gray-900 mt-2">
                  Total: ₹{form.items.reduce((s, i) => s + Number(i.total_price), 0).toLocaleString('en-IN')}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-emerald-400 resize-none" />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => { setShowForm(false); setForm(emptyForm()) }} className="btn-secondary text-xs px-4 py-2">Cancel</button>
                <button type="submit" className="btn-primary text-xs px-4 py-2">Save Purchase</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
