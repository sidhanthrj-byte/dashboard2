'use client'
import { useEffect, useState } from 'react'

type Project = { id: string; name: string; client_name: string; city: string; status: string; completion_date: string; ceiling_area_sqft: number; contract_value: number; team_lead: string }

function fmt(n: number) { return '₹' + n.toLocaleString('en-IN') }
function fmtDate(s: string) { if (!s) return '—'; return new Date(s).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) }

export default function CompletedProjects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [filterMonth, setFilterMonth] = useState('')

  useEffect(() => {
    fetch('/api/projects?status=completed').then(r=>r.json()).then(d=>{
      // also get invoiced
      fetch('/api/projects?status=invoiced').then(r=>r.json()).then(inv => {
        setProjects([...d, ...inv].sort((a: Project, b: Project) => (b.completion_date||'').localeCompare(a.completion_date||'')))
        setLoading(false)
      })
    }).catch(()=>setLoading(false))
  }, [])

  const months = Array.from(new Set(projects.map(p => p.completion_date?.slice(0,7)).filter(Boolean))).sort().reverse()
  const filtered = filterMonth ? projects.filter(p => p.completion_date?.startsWith(filterMonth)) : projects
  const totalArea = filtered.reduce((s,p)=>s+p.ceiling_area_sqft,0)
  const totalValue = filtered.reduce((s,p)=>s+p.contract_value,0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Completed Projects</h1>
        <select value={filterMonth} onChange={e=>setFilterMonth(e.target.value)} className="input w-44">
          <option value="">All Time</option>
          {months.map(m => <option key={m} value={m}>{new Date(m+'-01').toLocaleDateString('en-IN',{month:'long',year:'numeric'})}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="card">
          <p className="text-xs text-gray-500 mb-1">Total Projects</p>
          <p className="text-2xl font-bold text-green-600">{filtered.length}</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500 mb-1">Total Area Installed</p>
          <p className="text-2xl font-bold text-gray-900">{totalArea.toLocaleString('en-IN')} sqft</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500 mb-1">Total Contract Value</p>
          <p className="text-2xl font-bold text-purple-600">{fmt(totalValue)}</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500 mb-1">Avg per Project</p>
          <p className="text-2xl font-bold text-gray-700">{filtered.length ? fmt(Math.round(totalValue/filtered.length)) : '—'}</p>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left text-xs text-gray-500">
                <th className="px-4 py-3 font-semibold">Project</th>
                <th className="px-4 py-3 font-semibold">Client</th>
                <th className="px-4 py-3 font-semibold">City</th>
                <th className="px-4 py-3 font-semibold">Area (sqft)</th>
                <th className="px-4 py-3 font-semibold">Contract Value</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Completed</th>
                <th className="px-4 py-3 font-semibold">Team Lead</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>
              : filtered.length === 0 ? <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">No completed projects yet</td></tr>
              : filtered.map(p => (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                  <td className="px-4 py-3 text-gray-600">{p.client_name}</td>
                  <td className="px-4 py-3 text-gray-500">{p.city||'—'}</td>
                  <td className="px-4 py-3 text-gray-600">{p.ceiling_area_sqft||'—'}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{p.contract_value>0?fmt(p.contract_value):'—'}</td>
                  <td className="px-4 py-3"><span className={`badge ${p.status==='invoiced'?'bg-purple-100 text-purple-700':'bg-green-100 text-green-700'}`}>{p.status}</span></td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{fmtDate(p.completion_date)}</td>
                  <td className="px-4 py-3 text-gray-600">{p.team_lead||'—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
