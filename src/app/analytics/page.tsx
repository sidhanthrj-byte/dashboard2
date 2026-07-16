'use client'
import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

type AnalyticsData = {
  monthlyQuotes: { month: string; count: number; value: number }[]
  topClients: { name: string; count: number; value: number; last: string }[]
  quoteStatus: { status: string; count: number }[]
  totalInvValue: number
  invByCategory: { cat: string; val: number }[]
  spendByCategory: { cat: string; val: number }[]
  lowStockCount: number
  projectsByStatus: Record<string, { count: number; value: number; area: number }>
  totalActiveProjects: number
  totalQuotesThisMonth: number
  totalValueThisMonth: number
}

const PIE_COLORS = ['#1f2937','#6366f1','#f59e0b','#10b981','#ef4444','#8b5cf6','#06b6d4']
function fmt(n: number) { return '₹' + Math.round(n).toLocaleString('en-IN') }

const STATUS_LABELS: Record<string, string> = { draft:'Draft', sent:'Sent', won:'Won', lost:'Lost', accepted:'Accepted' }

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/analytics').then(r=>r.json()).then(d=>{setData(d);setLoading(false)}).catch(()=>setLoading(false))
  }, [])

  if (loading) return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-gray-200 rounded" />
      <div className="grid grid-cols-4 gap-4">{[...Array(4)].map((_,i)=><div key={i} className="h-24 bg-gray-100 rounded-xl"/>)}</div>
      <div className="grid grid-cols-2 gap-4"><div className="h-64 bg-gray-100 rounded-xl"/><div className="h-64 bg-gray-100 rounded-xl"/></div>
    </div>
  )
  if (!data) return <div className="text-red-500 text-sm">Failed to load analytics.</div>

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Analytics</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Quotes This Month', value: data.totalQuotesThisMonth, sub: fmt(data.totalValueThisMonth), color: 'text-indigo-600' },
          { label: 'Active Projects', value: data.totalActiveProjects, sub: 'in pipeline', color: 'text-amber-600' },
          { label: 'Inventory Value', value: fmt(data.totalInvValue), sub: 'stock on hand', color: 'text-emerald-600' },
          { label: 'Low Stock Items', value: data.lowStockCount, sub: 'need reorder', color: data.lowStockCount > 0 ? 'text-red-500' : 'text-gray-600' },
        ].map(c => (
          <div key={c.label} className="card">
            <p className="text-xs text-gray-500 mb-1">{c.label}</p>
            <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
            <p className="text-xs text-gray-400 mt-1">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Monthly Quotes */}
      <div className="card">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Monthly Quotes (Last 6 Months)</h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data.monthlyQuotes}>
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
            <Tooltip formatter={(v, name) => [name === 'value' ? fmt(Number(v)) : v, name === 'value' ? 'Quote Value' : 'Count']} />
            <Bar yAxisId="left" dataKey="count" fill="#6366f1" radius={[3,3,0,0]} name="count" />
            <Bar yAxisId="right" dataKey="value" fill="#1f2937" radius={[3,3,0,0]} name="value" />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex gap-4 mt-2 justify-center">
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-indigo-500" /><span className="text-xs text-gray-500">Quote Count</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-gray-900" /><span className="text-xs text-gray-500">Quote Value</span></div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Quote Status */}
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Quotes by Status</h2>
          {data.quoteStatus.length === 0 ? <p className="text-gray-400 text-xs text-center py-8">No quotes yet</p> : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={data.quoteStatus.map(s=>({...s, name: STATUS_LABELS[s.status]??s.status}))} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={true} labelLine={false}>
                  {data.quoteStatus.map((_,i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Project Pipeline */}
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Project Pipeline</h2>
          {Object.keys(data.projectsByStatus).length === 0 ? <p className="text-gray-400 text-xs text-center py-8">No projects yet</p> : (
            <div className="space-y-2">
              {Object.entries(data.projectsByStatus).map(([status, d]) => (
                <div key={status} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-xs font-medium text-gray-700 capitalize">{status.replace('_',' ')}</p>
                    <p className="text-[11px] text-gray-400">{d.count} project{d.count !== 1 ? 's' : ''} · {d.area.toLocaleString('en-IN')} sqft</p>
                  </div>
                  <p className="text-xs font-semibold text-gray-900">{fmt(d.value)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top Clients */}
      <div className="card">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Top Clients by Quote Value</h2>
        {data.topClients.length === 0 ? <p className="text-gray-400 text-xs text-center py-6">No clients yet</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                <th className="pb-2 font-medium">Client</th>
                <th className="pb-2 font-medium text-right">Quotes</th>
                <th className="pb-2 font-medium text-right">Total Value</th>
                <th className="pb-2 font-medium text-right">Last Quote</th>
              </tr></thead>
              <tbody>
                {data.topClients.map((c, i) => (
                  <tr key={c.name} className="border-b border-gray-50 last:border-0">
                    <td className="py-2"><span className="text-xs text-gray-400 w-5 inline-block">{i+1}.</span> <span className="font-medium text-gray-900">{c.name}</span></td>
                    <td className="py-2 text-right text-gray-600">{c.count}</td>
                    <td className="py-2 text-right font-semibold text-gray-900">{fmt(c.value)}</td>
                    <td className="py-2 text-right text-gray-400 text-xs">{c.last ? new Date(c.last).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Inventory */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Inventory Value by Category</h2>
          {data.invByCategory.filter(c=>c.val>0).length === 0 ? <p className="text-gray-400 text-xs text-center py-6">No inventory data</p> : (
            <div className="space-y-2">
              {data.invByCategory.filter(c=>c.val>0).sort((a,b)=>b.val-a.val).map(c => (
                <div key={c.cat} className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">{c.cat}</span>
                  <span className="text-xs font-semibold text-gray-900">{fmt(c.val)}</span>
                </div>
              ))}
              <div className="border-t border-gray-100 pt-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-700">Total</span>
                <span className="text-sm font-bold text-gray-900">{fmt(data.totalInvValue)}</span>
              </div>
            </div>
          )}
        </div>
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Purchase Spend by Category</h2>
          {data.spendByCategory.length === 0 ? <p className="text-gray-400 text-xs text-center py-6">No purchase data</p> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.spendByCategory.slice(0,6)} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="cat" tick={{ fontSize: 10 }} width={90} />
                <Tooltip formatter={(v) => fmt(Number(v))} />
                <Bar dataKey="val" fill="#10b981" radius={[0,3,3,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}
