'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Search, FileText, Plus, Trash2, Eye, Users, Calendar, MapPin,
  Copy, TrendingUp, Hash, BarChart2, IndianRupee, Clock, Edit3,
  CheckCircle2, SendHorizontal, XCircle, AlertCircle, ChevronDown,
} from 'lucide-react'
import type { Quote } from '@/lib/types'
import { fmtINR, calculateQuote } from '@/lib/calculations'

const TIER_LABEL: Record<string, string> = { dealer: 'Dealer', msp: 'MSP', specifiors: 'Specifiors' }
const TIER_CLASS: Record<string, string> = { dealer: 'badge-dealer', msp: 'badge-msp', specifiors: 'badge-specifiors' }

type QuoteStatus = 'draft' | 'sent' | 'approved' | 'rejected'
const STATUS_LABELS: Record<QuoteStatus, string> = { draft: 'Draft', sent: 'Sent', approved: 'Approved', rejected: 'Rejected' }
const STATUS_CLASS: Record<QuoteStatus, string> = {
  draft: 'badge-draft', sent: 'badge-sent', approved: 'badge-approved', rejected: 'badge-rejected',
}
const STATUS_ICONS: Record<QuoteStatus, React.ReactNode> = {
  draft: <AlertCircle size={10} />,
  sent: <SendHorizontal size={10} />,
  approved: <CheckCircle2 size={10} />,
  rejected: <XCircle size={10} />,
}

function getStatus(quote: Quote): QuoteStatus {
  return ((quote as unknown as Record<string, unknown>).status as QuoteStatus) ?? 'draft'
}

export default function HomePage() {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [duplicating, setDuplicating] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | 'all'>('all')

  const fetchQuotes = useCallback(async (q = '') => {
    setLoading(true)
    const res = await fetch(`/api/quotes?q=${encodeURIComponent(q)}`)
    const data = await res.json()
    setQuotes(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchQuotes() }, [fetchQuotes])
  useEffect(() => {
    const t = setTimeout(() => fetchQuotes(search), 300)
    return () => clearTimeout(t)
  }, [search, fetchQuotes])

  // Stats
  const totals = quotes.reduce((acc, q) => {
    try {
      const bd = calculateQuote(q)
      acc.value += bd.grandTotal
      acc.sqft += (bd.totalSqft ?? 0)
      acc.count++
    } catch { /* skip */ }
    return acc
  }, { value: 0, sqft: 0, count: 0 })

  const avgQuoteValue = totals.count > 0 ? totals.value / totals.count : 0
  const byTier = quotes.reduce<Record<string, number>>((acc, q) => {
    acc[q.priceTier] = (acc[q.priceTier] ?? 0) + 1; return acc
  }, {})
  const thisMonth = new Date().toISOString().slice(0, 7)
  const thisMonthQuotes = quotes.filter(q => q.date?.startsWith(thisMonth))
  const thisMonthValue = thisMonthQuotes.reduce((s, q) => { try { return s + calculateQuote(q).grandTotal } catch { return s } }, 0)
  const locCount = quotes.reduce<Record<string, number>>((acc, q) => {
    if (q.location) acc[q.location] = (acc[q.location] ?? 0) + 1; return acc
  }, {})
  const topLocation = Object.entries(locCount).sort((a, b) => b[1] - a[1])[0]
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
  const recentCount = quotes.filter(q => q.date >= sevenDaysAgo).length
  const approvedValue = quotes.filter(q => getStatus(q) === 'approved')
    .reduce((s, q) => { try { return s + calculateQuote(q).grandTotal } catch { return s } }, 0)

  const filtered = statusFilter === 'all' ? quotes : quotes.filter(q => getStatus(q) === statusFilter)

  async function updateStatus(id: string, status: QuoteStatus) {
    const quote = quotes.find(q => q.id === id)
    if (!quote) return
    await fetch(`/api/quotes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...quote, status }),
    })
    setQuotes(prev => prev.map(q => q.id === id ? { ...q, status } as Quote : q))
  }

  async function deleteQuote(id: string, name: string) {
    if (!confirm(`Delete quote for "${name}"? This cannot be undone.`)) return
    setDeleting(id)
    await fetch(`/api/quotes/${id}`, { method: 'DELETE' })
    setQuotes(prev => prev.filter(q => q.id !== id))
    setDeleting(null)
  }

  async function duplicateQuote(quote: Quote) {
    setDuplicating(quote.id)
    const payload = {
      ...quote,
      id: undefined,
      quoteNumber: undefined,
      clientName: quote.clientName + ' (Copy)',
      status: 'draft',
      date: new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    }
    const res = await fetch('/api/quotes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const created = await res.json()
    setDuplicating(null)
    window.location.href = `/quotes/${created.id}/edit`
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {loading ? 'Loading…' : `${quotes.length} quote${quotes.length !== 1 ? 's' : ''} total`}
          </p>
        </div>
        <a href="/quotes/new" className="btn-primary gap-2">
          <Plus size={16} /> New Quote
        </a>
      </div>

      {/* Stats */}
      {!loading && quotes.length > 0 && !search && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Total Quotes', value: quotes.length, sub: `${recentCount} this week`, icon: <Hash size={17} />, bg: 'bg-slate-100', fg: 'text-slate-600' },
              { label: 'Pipeline Value', value: fmtINR(totals.value), sub: `avg ${fmtINR(avgQuoteValue)}`, icon: <TrendingUp size={17} />, bg: 'bg-emerald-50', fg: 'text-emerald-600' },
              { label: 'Won Value', value: fmtINR(approvedValue), sub: 'approved quotes', icon: <CheckCircle2 size={17} />, bg: 'bg-blue-50', fg: 'text-blue-600' },
              { label: 'This Month', value: fmtINR(thisMonthValue), sub: `${thisMonthQuotes.length} quotes`, icon: <Calendar size={17} />, bg: 'bg-violet-50', fg: 'text-violet-600' },
            ].map(s => (
              <div key={s.label} className="card p-5 flex items-center gap-4">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${s.bg}`}>
                  <span className={s.fg}>{s.icon}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-slate-500 font-medium">{s.label}</p>
                  <p className="text-lg font-bold text-slate-900 leading-tight">{s.value}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{s.sub}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Tier breakdown with mini bar */}
            <div className="card p-5">
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <BarChart2 size={12} /> By Price Tier
              </p>
              <div className="space-y-2.5">
                {Object.entries(byTier).map(([tier, count]) => (
                  <div key={tier}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600">{TIER_LABEL[tier] ?? tier}</span>
                      <span className="font-semibold text-slate-800">{count}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-slate-400 rounded-full"
                        style={{ width: `${(count / quotes.length) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Status breakdown */}
            <div className="card p-5">
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-3">Quote Status</p>
              <div className="grid grid-cols-2 gap-2">
                {(['draft','sent','approved','rejected'] as QuoteStatus[]).map(s => {
                  const n = quotes.filter(q => getStatus(q) === s).length
                  return (
                    <button key={s} onClick={() => setStatusFilter(prev => prev === s ? 'all' : s)}
                      className={`text-left p-2.5 rounded-xl border transition-all ${statusFilter === s ? 'border-slate-400 bg-slate-50' : 'border-slate-100 hover:border-slate-200'}`}>
                      <p className="text-lg font-bold text-slate-900">{n}</p>
                      <p className={`text-[11px] font-semibold mt-0.5 ${STATUS_CLASS[s].includes('emerald') ? 'text-emerald-600' : STATUS_CLASS[s].includes('blue') ? 'text-blue-600' : STATUS_CLASS[s].includes('rose') ? 'text-rose-500' : 'text-slate-500'}`}>
                        {STATUS_LABELS[s]}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Top location */}
            <div className="card p-5">
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <MapPin size={12} /> Top Locations
              </p>
              <div className="space-y-2">
                {Object.entries(locCount).sort((a,b) => b[1]-a[1]).slice(0,4).map(([loc, n]) => (
                  <div key={loc} className="flex items-center justify-between text-sm">
                    <span className="text-slate-700 truncate">{loc}</span>
                    <span className="text-xs font-semibold text-slate-500 shrink-0 ml-2">{n}</span>
                  </div>
                ))}
                {Object.keys(locCount).length === 0 && <p className="text-sm text-slate-400">—</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search + filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-10" placeholder="Search client, project, quote #, location…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {statusFilter !== 'all' && (
          <button onClick={() => setStatusFilter('all')}
            className="btn-secondary text-xs gap-2 self-start">
            <XCircle size={13} /> Clear filter: {STATUS_LABELS[statusFilter]}
          </button>
        )}
      </div>

      {/* Quote list */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="card p-5 animate-pulse h-24">
              <div className="h-4 bg-slate-100 rounded-lg w-1/3 mb-3" />
              <div className="h-3 bg-slate-100 rounded-lg w-1/2" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-20 text-center">
          <FileText size={44} className="text-slate-200 mx-auto mb-4" />
          <p className="text-slate-500 font-semibold">
            {search ? 'No quotes match your search' : statusFilter !== 'all' ? `No ${STATUS_LABELS[statusFilter].toLowerCase()} quotes` : 'No quotes yet'}
          </p>
          <p className="text-slate-400 text-sm mt-1">
            {!search && statusFilter === 'all' && 'Create your first quote to get started'}
          </p>
          {!search && statusFilter === 'all' && (
            <a href="/quotes/new" className="btn-primary mt-5 inline-flex">
              <Plus size={15} /> Create first quote
            </a>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map(quote => (
            <QuoteCard
              key={quote.id}
              quote={quote}
              deleting={deleting === quote.id}
              duplicating={duplicating === quote.id}
              onDelete={() => deleteQuote(quote.id, quote.clientName)}
              onDuplicate={() => duplicateQuote(quote)}
              onStatusChange={s => updateStatus(quote.id, s)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function QuoteCard({ quote, deleting, duplicating, onDelete, onDuplicate, onStatusChange }: {
  quote: Quote
  deleting: boolean
  duplicating: boolean
  onDelete: () => void
  onDuplicate: () => void
  onStatusChange: (s: QuoteStatus) => void
}) {
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const status = getStatus(quote)
  const date = new Date(quote.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  const itemCount = quote.items?.length ?? 0
  let grandTotal = 0
  try { grandTotal = calculateQuote(quote).grandTotal } catch {}

  const isExpiring = quote.validUntil && new Date(quote.validUntil) < new Date(Date.now() + 5 * 86400000)
    && new Date(quote.validUntil) > new Date()

  return (
    <div className="card p-5 flex flex-col sm:flex-row sm:items-center gap-4 hover:shadow-md hover:border-slate-300 transition-all duration-200">
      {/* Status dot + icon */}
      <div className="shrink-0">
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center
          ${status === 'approved' ? 'bg-emerald-50' : status === 'sent' ? 'bg-blue-50' : status === 'rejected' ? 'bg-rose-50' : 'bg-slate-100'}`}>
          <FileText size={18} className={
            status === 'approved' ? 'text-emerald-600' : status === 'sent' ? 'text-blue-600' : status === 'rejected' ? 'text-rose-500' : 'text-slate-500'
          } />
        </div>
      </div>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="font-bold text-slate-900 text-[15px]">{quote.clientName}</span>
          <span className="badge badge-draft text-[11px]">{quote.quoteNumber}</span>
          <span className={`${TIER_CLASS[quote.priceTier] ?? 'badge-draft'} text-[11px]`}>
            {TIER_LABEL[quote.priceTier]}
          </span>
          {/* Status badge with dropdown */}
          <div className="relative">
            <button onClick={() => setShowStatusMenu(v => !v)}
              className={`${STATUS_CLASS[status]} flex items-center gap-1 text-[11px] cursor-pointer hover:opacity-80`}>
              {STATUS_ICONS[status]}
              {STATUS_LABELS[status]}
              <ChevronDown size={9} />
            </button>
            {showStatusMenu && (
              <div className="absolute top-full left-0 mt-1 w-32 bg-white border border-slate-200 rounded-xl shadow-lg z-10 py-1 overflow-hidden">
                {(['draft','sent','approved','rejected'] as QuoteStatus[]).map(s => (
                  <button key={s} onClick={() => { onStatusChange(s); setShowStatusMenu(false) }}
                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 flex items-center gap-2">
                    {STATUS_ICONS[s]} {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            )}
          </div>
          {grandTotal > 0 && (
            <span className="font-bold text-slate-900 text-sm ml-1">{fmtINR(grandTotal)}</span>
          )}
        </div>

        {quote.projectName && (
          <p className="text-sm text-slate-600 truncate">{quote.projectName}</p>
        )}

        <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-400 flex-wrap">
          <span className="flex items-center gap-1"><Calendar size={11} />{date}</span>
          {quote.location && <span className="flex items-center gap-1"><MapPin size={11} />{quote.location}</span>}
          <span>{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
          {isExpiring && (
            <span className="flex items-center gap-1 text-rose-500 font-medium">
              <AlertCircle size={11} /> Expiring soon
            </span>
          )}
          {quote.includeGst && <span className="text-slate-400">GST incl.</span>}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
        <a href={`/quotes/${quote.id}/client`} className="btn-primary text-xs px-3 py-1.5 gap-1.5">
          <Eye size={13} /> Client PDF
        </a>
        <a href={`/quotes/${quote.id}/team`} className="btn-secondary text-xs px-3 py-1.5 gap-1.5">
          <Users size={13} /> Team
        </a>
        <a href={`/quotes/${quote.id}/edit`} className="btn-ghost text-xs px-2.5 py-1.5 gap-1">
          <Edit3 size={13} />
        </a>
        <button onClick={onDuplicate} disabled={duplicating}
          className="btn-ghost text-xs px-2.5 py-1.5" title="Duplicate">
          <Copy size={13} />
        </button>
        <button onClick={onDelete} disabled={deleting}
          className="btn-ghost text-xs px-2.5 py-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50" title="Delete">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}
