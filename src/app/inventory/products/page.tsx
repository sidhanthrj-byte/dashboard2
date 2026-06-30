'use client'

import { useEffect, useState } from 'react'
import { Pencil, Trash2, X, Check } from 'lucide-react'

const CATEGORIES = ['Pongs Descor Fabric', 'LED Lights', 'Driver', 'Controller', 'DALI Driver', 'Gripper', 'Service', 'Power Repeater']
const CATEGORY_COLORS: Record<string, string> = {
  'Pongs Descor Fabric': 'bg-violet-100 text-violet-700',
  'LED Lights': 'bg-yellow-100 text-yellow-700',
  'Driver': 'bg-green-100 text-green-700',
  'Controller': 'bg-blue-100 text-blue-700',
  'DALI Driver': 'bg-indigo-100 text-indigo-700',
  'Gripper': 'bg-orange-100 text-orange-700',
  'Service': 'bg-rose-100 text-rose-700',
  'Power Repeater': 'bg-cyan-100 text-cyan-700',
}

interface Product {
  id: string; name: string; category: string; sku: string; unit: string
  current_stock: number; min_stock: number; cost_price: number; sell_price: number; notes: string
}

const empty = (): Omit<Product, 'id'> => ({ name: '', category: '', sku: '', unit: 'nos', current_stock: 0, min_stock: 0, cost_price: 0, sell_price: 0, notes: '' })

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(empty())
  const [editId, setEditId] = useState<string | null>(null)
  const [catFilter, setCatFilter] = useState('')
  const [loading, setLoading] = useState(true)

  function load(cat?: string) {
    const url = cat ? `/api/inventory/products?category=${encodeURIComponent(cat)}` : '/api/inventory/products'
    fetch(url).then(r => r.json()).then(d => { setProducts(d); setLoading(false) })
  }

  useEffect(() => { load() }, [])

  function handleCatFilter(cat: string) {
    setCatFilter(cat)
    load(cat || undefined)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (editId) {
      await fetch(`/api/inventory/products/${editId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    } else {
      await fetch('/api/inventory/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    }
    setShowForm(false); setEditId(null); setForm(empty()); load(catFilter || undefined)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this product?')) return
    await fetch(`/api/inventory/products/${id}`, { method: 'DELETE' })
    load(catFilter || undefined)
  }

  function startEdit(p: Product) {
    setEditId(p.id); setForm({ name: p.name, category: p.category, sku: p.sku, unit: p.unit, current_stock: p.current_stock, min_stock: p.min_stock, cost_price: p.cost_price, sell_price: p.sell_price, notes: p.notes })
    setShowForm(true)
  }

  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }))

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">Products Inventory</h1>
        <button className="btn btn-primary text-sm" onClick={() => { setShowForm(s => !s); setEditId(null); setForm(empty()) }}>
          {showForm ? 'Cancel' : '+ Add Product'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card mb-4 space-y-3">
          <h2 className="font-semibold text-sm text-gray-700">{editId ? 'Edit Product' : 'New Product'}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div><label className="label">Name *</label><input className="input" required value={form.name} onChange={f('name')} /></div>
            <div><label className="label">Category</label>
              <select className="select" value={form.category} onChange={f('category')}>
                <option value="">Select...</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div><label className="label">SKU</label><input className="input" value={form.sku} onChange={f('sku')} /></div>
            <div><label className="label">Unit</label><input className="input" value={form.unit} onChange={f('unit')} /></div>
            <div><label className="label">Current Stock</label><input className="input" type="number" value={form.current_stock} onChange={f('current_stock')} /></div>
            <div><label className="label">Min Stock</label><input className="input" type="number" value={form.min_stock} onChange={f('min_stock')} /></div>
            <div><label className="label">Cost Price (₹)</label><input className="input" type="number" value={form.cost_price} onChange={f('cost_price')} /></div>
            <div><label className="label">Sell Price (₹)</label><input className="input" type="number" value={form.sell_price} onChange={f('sell_price')} /></div>
            <div className="col-span-2 md:col-span-1"><label className="label">Notes</label><input className="input" value={form.notes} onChange={f('notes')} /></div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn btn-primary text-sm">{editId ? 'Update' : 'Create'}</button>
            <button type="button" className="btn btn-secondary text-sm" onClick={() => { setShowForm(false); setEditId(null); setForm(empty()) }}>Cancel</button>
          </div>
        </form>
      )}

      <div className="flex items-center gap-3 mb-4">
        <label className="label">Filter by Category:</label>
        <select className="select w-56" value={catFilter} onChange={e => handleCatFilter(e.target.value)}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {loading ? <div className="text-gray-400 text-sm">Loading...</div> : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left text-xs text-gray-500">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">Unit</th>
                <th className="px-4 py-3 font-medium text-right">Stock</th>
                <th className="px-4 py-3 font-medium text-right">Cost (₹)</th>
                <th className="px-4 py-3 font-medium text-right">Sell (₹)</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium"><a href={`/inventory/products/${p.id}`} className="text-gray-900 hover:text-emerald-600 hover:underline">{p.name}</a></td>
                  <td className="px-4 py-2.5">
                    {p.category && <span className={`badge ${CATEGORY_COLORS[p.category] ?? 'bg-gray-100 text-gray-700'}`}>{p.category}</span>}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">{p.sku}</td>
                  <td className="px-4 py-2.5 text-gray-500">{p.unit}</td>
                  <td className="px-4 py-2.5 text-right">{p.current_stock}</td>
                  <td className="px-4 py-2.5 text-right">{Number(p.cost_price).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-2.5 text-right">{Number(p.sell_price).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1">
                      <button className="p-1.5 rounded hover:bg-gray-100 text-gray-500" onClick={() => startEdit(p)}><Pencil size={13} /></button>
                      <button className="p-1.5 rounded hover:bg-red-50 text-red-400" onClick={() => handleDelete(p.id)}><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!products.length && <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No products found.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
