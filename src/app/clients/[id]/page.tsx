'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'

interface Client {
  id: string; name: string; company: string; email: string; phone: string
  city: string; address: string; gst_number: string; source: string; status: string
  notes: string; created_at: string
}
interface Quote { id: string; clientName: string; grandTotal: number; status: string; created_at: string }
interface Project { id: string; name: string; status: string; contract_value: number; created_at: string }

function fmtINR(n: number) { return '₹' + Math.round(n).toLocaleString('en-IN') }
function fmtDate(s: string) { return s ? new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—' }

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [client, setClient] = useState<Client | null>(null)
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const r = await fetch(`/api/clients/${id}`)
    const data = await r.json()
    setClient(data.client)
    setQuotes(data.quotes || [])
    setProjects(data.projects || [])
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  if (loading) return <div className="space-y-4">{[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}</div>
  if (!client) return <div className="text-center py-16 text-gray-400">Client not found</div>

  const totalQuoteValue = quotes.reduce((s, q) => s + Number(q.grandTotal || 0), 0)
  const totalProjectValue = projects.reduce((s, p) => s + Number(p.contract_value || 0), 0)

  const statusColor: Record<string, string> = {
    active: 'bg-green-100 text-green-700', inactive: 'bg-gray-100 text-gray-600',
    vip: 'bg-yellow-100 text-yellow-700', blacklisted: 'bg-red-100 text-red-700'
  }
  const quoteStatusColor: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600', sent: 'bg-blue-100 text-blue-700',
    approved: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700'
  }
  const projectStatusColor: Record<string, string> = {
    scheduled: 'bg-blue-100 text-blue-700', 'in_progress': 'bg-orange-100 text-orange-700',
    completed: 'bg-green-100 text-green-700', invoiced: 'bg-purple-100 text-purple-700'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <a href="/clients" className="text-sm text-gray-500 hover:text-gray-900">← Clients</a>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[client.status] || 'bg-gray-100 text-gray-600'}`}>{client.status}</span>
            </div>
            {client.company && <p className="text-gray-500 mt-1">{client.company}</p>}
          </div>
          <a href={`/clients/${id}/edit`} className="text-sm text-gray-500 hover:text-gray-900 px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50">Edit</a>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100">
          <div>
            <div className="text-xs text-gray-500 mb-1">Phone</div>
            <div className="font-medium text-gray-900">{client.phone || '—'}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Email</div>
            <div className="font-medium text-gray-900 break-all">{client.email || '—'}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">City</div>
            <div className="font-medium text-gray-900">{client.city || '—'}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Source</div>
            <div className="font-medium text-gray-900 capitalize">{client.source?.replace('_', ' ') || '—'}</div>
          </div>
          {client.gst_number && (
            <div>
              <div className="text-xs text-gray-500 mb-1">GST</div>
              <div className="font-medium text-gray-900">{client.gst_number}</div>
            </div>
          )}
          {client.address && (
            <div className="col-span-2">
              <div className="text-xs text-gray-500 mb-1">Address</div>
              <div className="font-medium text-gray-900">{client.address}</div>
            </div>
          )}
          <div>
            <div className="text-xs text-gray-500 mb-1">Client Since</div>
            <div className="font-medium text-gray-900">{fmtDate(client.created_at)}</div>
          </div>
        </div>

        {client.notes && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-500 mb-1">Notes</div>
            <p className="text-sm text-gray-700">{client.notes}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{quotes.length}</div>
          <div className="text-xs text-gray-500 mt-1">Total Quotes</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <div className="text-lg font-bold text-gray-900">{fmtINR(totalQuoteValue)}</div>
          <div className="text-xs text-gray-500 mt-1">Quoted Value</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <div className="text-lg font-bold text-gray-900">{fmtINR(totalProjectValue)}</div>
          <div className="text-xs text-gray-500 mt-1">Project Value</div>
        </div>
      </div>

      {quotes.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 font-semibold text-gray-900">Quotes ({quotes.length})</div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Quote</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Amount</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {quotes.map(q => (
                <tr key={q.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3"><a href={`/quotes/${q.id}`} className="text-blue-600 hover:underline font-mono text-xs">{q.id.slice(0, 8)}</a></td>
                  <td className="px-4 py-3 text-gray-500">{fmtDate(q.created_at)}</td>
                  <td className="px-4 py-3 text-right font-medium">{q.grandTotal ? fmtINR(Number(q.grandTotal)) : '—'}</td>
                  <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${quoteStatusColor[q.status] || 'bg-gray-100 text-gray-600'}`}>{q.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {projects.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 font-semibold text-gray-900">Projects ({projects.length})</div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Project</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Value</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {projects.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3"><a href={`/projects/all`} className="font-medium text-gray-900 hover:underline">{p.name}</a></td>
                  <td className="px-4 py-3 text-gray-500">{fmtDate(p.created_at)}</td>
                  <td className="px-4 py-3 text-right font-medium">{p.contract_value ? fmtINR(Number(p.contract_value)) : '—'}</td>
                  <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${projectStatusColor[p.status] || 'bg-gray-100 text-gray-600'}`}>{p.status?.replace('_', ' ')}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
