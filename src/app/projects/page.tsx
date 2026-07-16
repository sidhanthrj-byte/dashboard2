'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

type Project = {
  id: string; name: string; client_name: string; city: string; status: string;
  scheduled_date: string; completion_date: string; team_lead: string; ceiling_area_sqft: number; contract_value: number; priority: string;
}

const STATUS_COLS = ['scheduled','in_progress','completed','invoiced'] as const
const STATUS_LABELS: Record<string, string> = { scheduled:'Scheduled', in_progress:'In Progress', completed:'Completed', invoiced:'Invoiced', cancelled:'Cancelled' }
const STATUS_COLORS: Record<string, string> = { scheduled:'bg-blue-50 border-blue-200 text-blue-700', in_progress:'bg-amber-50 border-amber-200 text-amber-700', completed:'bg-green-50 border-green-200 text-green-700', invoiced:'bg-purple-50 border-purple-200 text-purple-700', cancelled:'bg-gray-50 border-gray-200 text-gray-500' }
const PRIORITY_DOT: Record<string, string> = { urgent:'bg-red-500', high:'bg-orange-400', normal:'bg-blue-400', low:'bg-gray-300' }

function fmt(n: number) { return '₹' + n.toLocaleString('en-IN') }
function fmtDate(s: string) { if (!s) return '—'; const d = new Date(s); return d.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) }

export default function ProjectsDashboard() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/projects').then(r => r.json()).then(d => { setProjects(d); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const today = new Date().toISOString().slice(0, 10)
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
  const thisMonth = new Date().toISOString().slice(0, 7)

  const stats = {
    active: projects.filter(p => !['completed','invoiced','cancelled'].includes(p.status)).length,
    thisWeek: projects.filter(p => p.scheduled_date >= today && p.scheduled_date <= nextWeek).length,
    completedMonth: projects.filter(p => p.status === 'completed' && p.completion_date?.startsWith(thisMonth)).length,
    invoicedValue: projects.filter(p => p.status === 'invoiced').reduce((s, p) => s + p.contract_value, 0),
  }

  const byStatus: Record<string, Project[]> = {}
  for (const col of STATUS_COLS) byStatus[col] = projects.filter(p => p.status === col)
  const upcoming = projects.filter(p => p.scheduled_date >= today && p.scheduled_date <= nextWeek && p.status === 'scheduled').sort((a,b) => a.scheduled_date.localeCompare(b.scheduled_date))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Projects Dashboard</h1>
        <Link href="/projects/all" className="btn-primary text-xs px-4 py-2">+ New Project</Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-4 gap-4">{[...Array(4)].map((_,i) => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Active Projects', value: stats.active, color: 'text-amber-600' },
            { label: 'Scheduled This Week', value: stats.thisWeek, color: 'text-blue-600' },
            { label: 'Completed This Month', value: stats.completedMonth, color: 'text-green-600' },
            { label: 'Invoiced Value', value: fmt(stats.invoicedValue), color: 'text-purple-600' },
          ].map(c => (
            <div key={c.label} className="card">
              <p className="text-xs text-gray-500 mb-1">{c.label}</p>
              <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Kanban */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Project Pipeline</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STATUS_COLS.map(col => (
            <div key={col} className="bg-gray-50 rounded-xl p-3 min-h-[200px]">
              <div className="flex items-center justify-between mb-3">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${STATUS_COLORS[col]}`}>{STATUS_LABELS[col]}</span>
                <span className="text-xs text-gray-400 font-medium">{byStatus[col]?.length ?? 0}</span>
              </div>
              <div className="space-y-2">
                {(byStatus[col] ?? []).slice(0, 5).map(p => (
                  <div key={p.id} className="bg-white rounded-lg p-2.5 border border-gray-200 hover:border-amber-300 transition-colors cursor-pointer">
                    <div className="flex items-start gap-1.5 mb-1">
                      <div className={`w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0 ${PRIORITY_DOT[p.priority] ?? 'bg-gray-300'}`} />
                      <p className="text-xs font-semibold text-gray-900 leading-tight">{p.name}</p>
                    </div>
                    <p className="text-[11px] text-gray-500 ml-3">{p.client_name}</p>
                    {p.ceiling_area_sqft > 0 && <p className="text-[11px] text-gray-400 ml-3">{p.ceiling_area_sqft} sqft</p>}
                    {p.scheduled_date && <p className="text-[11px] text-gray-400 ml-3 mt-1">{fmtDate(p.scheduled_date)}</p>}
                  </div>
                ))}
                {(byStatus[col] ?? []).length > 5 && (
                  <Link href="/projects/all" className="text-[11px] text-amber-600 hover:underline ml-1">+{(byStatus[col].length - 5)} more</Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Upcoming This Week</h2>
          <div className="space-y-2">
            {upcoming.map(p => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">{p.name}</p>
                  <p className="text-xs text-gray-500">{p.client_name}{p.city ? ` · ${p.city}` : ''}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-amber-600">{fmtDate(p.scheduled_date)}</p>
                  {p.team_lead && <p className="text-xs text-gray-400">{p.team_lead}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
