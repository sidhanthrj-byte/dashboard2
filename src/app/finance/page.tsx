'use client'
import { useState, useEffect } from 'react'

function fmtINR(n: number) { return '₹' + Math.round(n).toLocaleString('en-IN') }

interface ProjectFinance {
  id: string; name: string; client_name: string; status: string
  contract_value: number; total_paid: number; total_expenses: number; created_at: string
}

export default function FinancePage() {
  const [projects, setProjects] = useState<ProjectFinance[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/finance').then(r => r.json()).then(data => { setProjects(data); setLoading(false) })
  }, [])

  const totalRevenue = projects.reduce((s, p) => s + Number(p.contract_value || 0), 0)
  const totalReceived = projects.reduce((s, p) => s + Number(p.total_paid || 0), 0)
  const totalExpenses = projects.reduce((s, p) => s + Number(p.total_expenses || 0), 0)
  const totalOutstanding = totalRevenue - totalReceived
  const grossProfit = totalReceived - totalExpenses

  const statusColors: Record<string, string> = {
    scheduled: 'bg-blue-100 text-blue-700', in_progress: 'bg-orange-100 text-orange-700',
    completed: 'bg-green-100 text-green-700', invoiced: 'bg-purple-100 text-purple-700'
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Finance Overview</h1>
        <p className="text-sm text-gray-500">Revenue, expenses and profitability across all projects</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <div className="text-xl font-bold text-gray-900">{fmtINR(totalRevenue)}</div>
          <div className="text-xs text-gray-500 mt-1">Total Contract Value</div>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-100 p-4 text-center">
          <div className="text-xl font-bold text-green-700">{fmtINR(totalReceived)}</div>
          <div className="text-xs text-gray-500 mt-1">Total Received</div>
        </div>
        <div className="bg-red-50 rounded-xl border border-red-100 p-4 text-center">
          <div className="text-xl font-bold text-red-600">{fmtINR(totalOutstanding)}</div>
          <div className="text-xs text-gray-500 mt-1">Outstanding</div>
        </div>
        <div className="bg-orange-50 rounded-xl border border-orange-100 p-4 text-center">
          <div className="text-xl font-bold text-orange-600">{fmtINR(totalExpenses)}</div>
          <div className="text-xs text-gray-500 mt-1">Total Expenses</div>
        </div>
        <div className={`rounded-xl border p-4 text-center ${grossProfit >= 0 ? 'bg-blue-50 border-blue-100' : 'bg-red-50 border-red-100'}`}>
          <div className={`text-xl font-bold ${grossProfit >= 0 ? 'text-blue-700' : 'text-red-600'}`}>{fmtINR(grossProfit)}</div>
          <div className="text-xs text-gray-500 mt-1">Gross Profit</div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 font-semibold text-gray-900">Project Breakdown</div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Project</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Client</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Contract</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Received</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Expenses</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {projects.map(p => {
                const profit = Number(p.total_paid || 0) - Number(p.total_expenses || 0)
                const pct = p.contract_value > 0 ? (profit / p.contract_value) * 100 : 0
                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <a href={`/projects/${p.id}`} className="font-medium text-gray-900 hover:underline">{p.name}</a>
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{p.client_name}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[p.status] || 'bg-gray-100 text-gray-600'}`}>{p.status?.replace('_', ' ')}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{fmtINR(Number(p.contract_value))}</td>
                    <td className="px-4 py-3 text-right text-green-700 hidden lg:table-cell">{fmtINR(Number(p.total_paid || 0))}</td>
                    <td className="px-4 py-3 text-right text-red-600 hidden lg:table-cell">{fmtINR(Number(p.total_expenses || 0))}</td>
                    <td className={`px-4 py-3 text-right font-medium ${profit >= 0 ? 'text-blue-700' : 'text-red-600'}`}>
                      {fmtINR(profit)} <span className="text-xs text-gray-400">({pct.toFixed(0)}%)</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {projects.length === 0 && <div className="text-center py-12 text-gray-400">No projects yet</div>}
        </div>
      )}
    </div>
  )
}
