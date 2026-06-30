'use client'
import { useEffect, useState } from 'react'

type Product = { id: string; name: string; category: string; unit: string; current_stock: number; min_stock: number; cost_price: number; supplier_id: string }

export default function ReorderPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/inventory/products').then(r=>r.json()).then(d => {
      setProducts(d.filter((p: Product) => p.min_stock > 0 && p.current_stock <= p.min_stock))
      setLoading(false)
    }).catch(()=>setLoading(false))
  }, [])

  const totalReorderValue = products.reduce((s,p) => s + (Math.max(0, p.min_stock - p.current_stock) * 2 * p.cost_price), 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Reorder Alerts</h1>
          <p className="text-xs text-gray-500 mt-0.5">Products at or below minimum stock level</p>
        </div>
        {products.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2">
            <p className="text-xs text-red-600 font-semibold">{products.length} item{products.length !== 1 ? 's' : ''} need reordering</p>
            <p className="text-[11px] text-red-400">Est. reorder cost: ₹{totalReorderValue.toLocaleString('en-IN')}</p>
          </div>
        )}
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-red-50 border-b border-red-100">
              <tr className="text-left text-xs text-gray-500">
                <th className="px-4 py-3 font-semibold">Product</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold text-right">Current Stock</th>
                <th className="px-4 py-3 font-semibold text-right">Min Stock</th>
                <th className="px-4 py-3 font-semibold text-right">Deficit</th>
                <th className="px-4 py-3 font-semibold text-right">Unit Cost</th>
                <th className="px-4 py-3 font-semibold text-right">Est. Cost</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400 animate-pulse">Loading…</td></tr>
              : products.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center">
                  <p className="text-3xl mb-2">✅</p>
                  <p className="text-gray-500 font-medium">All products are well stocked</p>
                  <p className="text-gray-400 text-xs mt-1">No reorders needed right now</p>
                </td></tr>
              ) : products.sort((a,b) => (a.current_stock/Math.max(1,a.min_stock)) - (b.current_stock/Math.max(1,b.min_stock))).map(p => {
                const deficit = Math.max(0, p.min_stock - p.current_stock)
                const isEmpty = p.current_stock <= 0
                return (
                  <tr key={p.id} className={`border-b border-gray-50 ${isEmpty ? 'bg-red-50' : 'bg-amber-50/30'}`}>
                    <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{p.category || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-bold ${isEmpty ? 'text-red-600' : 'text-amber-600'}`}>{p.current_stock} {p.unit}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">{p.min_stock} {p.unit}</td>
                    <td className="px-4 py-3 text-right font-semibold text-red-500">{deficit > 0 ? `${deficit} ${p.unit}` : 'At minimum'}</td>
                    <td className="px-4 py-3 text-right text-gray-600">₹{p.cost_price.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">{deficit > 0 ? `₹${(deficit * p.cost_price).toLocaleString('en-IN')}` : '—'}</td>
                    <td className="px-4 py-3">
                      {isEmpty
                        ? <span className="badge bg-red-100 text-red-700">Out of Stock</span>
                        : <span className="badge bg-amber-100 text-amber-700">Low Stock</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
