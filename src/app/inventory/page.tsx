'use client'

import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

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

function getCatColor(cat: string) {
  return CATEGORY_COLORS[cat] ?? 'bg-gray-100 text-gray-700'
}

interface Stats {
  purchases: {
    total: number
    last30Days: number
    totalAmount: number
    last30DaysAmount: number
    byMonth: { month: string; amount: number }[]
  }
  productCounts: Record<string, number>
  totalProducts: number
  stockValue: number
  lowStockCount: number
}

export default function InventoryDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/inventory/stats')
      .then(r => r.json())
      .then(d => { setStats(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-gray-400 text-sm">Loading...</div>
  if (!stats) return <div className="text-red-500 text-sm">Failed to load stats.</div>

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-gray-900 mb-5">Inventory Dashboard</h1>

        <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Purchases</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Purchases', value: stats.purchases.total },
            { label: 'Last 30 Days', value: stats.purchases.last30Days },
            { label: 'Total Amount', value: `₹${stats.purchases.totalAmount.toLocaleString('en-IN')}` },
            { label: 'Last 30 Days Amount', value: `₹${stats.purchases.last30DaysAmount.toLocaleString('en-IN')}` },
          ].map(c => (
            <div key={c.label} className="card">
              <p className="text-xs text-gray-500 mb-1">{c.label}</p>
              <p className="text-2xl font-bold text-gray-900">{c.value}</p>
            </div>
          ))}
        </div>

        {stats.purchases.byMonth.length > 0 && (
          <div className="card mb-8">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Purchase Amount by Month</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.purchases.byMonth}>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => `₹${Number(v).toLocaleString('en-IN')}`} />
                <Bar dataKey="amount" fill="#1f2937" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Inventory</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="card">
            <p className="text-xs text-gray-500 mb-1">Total Stock Value</p>
            <p className="text-2xl font-bold text-emerald-600">₹{Math.round(stats.stockValue ?? 0).toLocaleString('en-IN')}</p>
          </div>
          <div className="card">
            <p className="text-xs text-gray-500 mb-1">Low Stock Items</p>
            <p className={`text-2xl font-bold ${(stats.lowStockCount ?? 0) > 0 ? 'text-rose-600' : 'text-gray-900'}`}>{stats.lowStockCount ?? 0}</p>
          </div>
          <div className="card">
            <p className="text-xs text-gray-500 mb-1">Total Products</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalProducts}</p>
          </div>
          {Object.entries(stats.productCounts).map(([cat, count]) => (
            <div key={cat} className="card">
              <p className="text-xs text-gray-500 mb-1">{cat}</p>
              <p className="text-2xl font-bold text-gray-900">{count}</p>
            </div>
          ))}
        </div>

        <div className="card">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Products by Category</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                <th className="pb-2 font-medium">Category</th>
                <th className="pb-2 font-medium text-right">Count</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(stats.productCounts).map(([cat, count]) => (
                <tr key={cat} className="border-b border-gray-50 last:border-0">
                  <td className="py-2">
                    <span className={`badge ${getCatColor(cat)}`}>{cat}</span>
                  </td>
                  <td className="py-2 text-right font-medium">{count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
