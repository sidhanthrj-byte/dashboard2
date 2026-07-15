'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Search, FileText, Plus, Trash2, Eye, Users, Calendar, MapPin,
  Copy, TrendingUp, Hash, IndianRupee, Edit3,
  CheckCircle2, SendHorizontal, XCircle, AlertCircle, ChevronDown,
  ArrowUpRight, Filter,
} from 'lucide-react'
import type { Quote } from '@/lib/types'
import { fmtINR, calculateQuote } from '@/lib/calculations'
import { listCompanies } from '@/lib/companies'

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
const STATUS_COLORS: Record<QuoteStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-50 text-blue-700',
  approved: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-rose-50 text-rose-600',
}
const STATUS_ICON_COLORS: Record<QuoteStatus, string> = {
  draft: 'bg-gray-100 text-gray-500',
  sent: 'bg-blue-50 text-blue-600',
  approved: 'bg-emerald-50 text-emerald-600',
  rejected: 'bg-rose-50 text-rose-500',
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
  const [companyFilter, setCompanyFilter] = useState<string>('all')
  const [me, setMe] = useState<{ name?: string; role?: string; email?: string } | null>(null)
  const isAdmin = me?.role === 'admin' || me?.email?.toLowerCase() === 'sidhanthrj@gmail.com'

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => setMe(d)).catch(() => {})
  }, [])

  const fetchQuotes = useCallback(async (q = '', company = 'all') => {
    setLoading(true)
    const res = await fetch(`/api/quotes?q=${encodeURIComponent(q)}&company=${encodeURIComponent(company)}`)
    const data = await res.json()
    setQuotes(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchQuotes('', companyFilter) }, [fetchQuotes, companyFilter])
  useEffect(() => {
    const t = setTimeout(() => fetchQuotes(search, companyFilter), 300)
    return () => clearTimeout(t)
  }, [search, companyFilter, fetchQuotes])

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
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
  const recentCount = quotes.filter(q => q.date >= sevenDaysAgo).length
  const approvedValue = quotes.filter(q => getStatus(q) === 'approved')
    .reduce((s, q) => { try { return s + calculateQuote(q).grandTotal } catch { return s } }, 0)
  const conversionRate = quotes.length > 0
    ? Math.round((quotes.filter(q => getStatus(q) === 'approved').length / quotes.length) * 100)
    : 0

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

  const showStats = !loading && quotes.length > 0 && !search

  return (
    <div className="space-y-6">

      {/* Page header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            {isAdmin ? 'Dashboard' : `${me?.name ? me.name.split(' ')[0] + '’s' : 'My'} Workspace`}
          </h1>
          <p className="text-sm text-gray-400 mt-0.5 font-medium">
            {loading ? 'Loading…' : `${quotes.length} ${isAdmin ? 'quote' : 'of my quote'}${quotes.length !== 1 ? 's' : ''}`}
            {!loading && recentCount > 0 && ` · ${recentCount} this week`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Company filter — All / STC / NLS */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
            {[{ id: 'all', label: 'All' }, ...listCompanies().map(c => ({ id: c.id, label: c.shortName }))].map(c => (
              <button key={c.id}
                onClick={() => setCompanyFilter(c.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  companyFilter === c.id ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                }`}
              >{c.label}</button>
            ))}
          </div>
          <a href="/quotes/new" className="btn-primary gap-2">
            <Plus size={16} /> New Quote
          </a>
        </div>
      </div>

      {/* Stats Grid */}
      {showStats && (
        <div className="space-y-4">
          {/* Primary stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                label: isAdmin ? 'Total Quotes' : 'My Quotes',
                value: quotes.length,
                sub: `avg ${fmtINR(avgQuoteValue)}`,
                icon: <Hash size={16} />,
                color: 'text-gray-600',
                bg: 'bg-gray-100',
              },
              {
                label: 'Pipeline',
                value: fmtINR(totals.value),
                sub: `${totals.sqft.toFixed(0)} sqft total`,
                icon: <TrendingUp size={16} />,
                color: 'text-blue-600',
                bg: 'bg-blue-50',
              },
              {
                label: 'Won Value',
                value: fmtINR(approvedValue),
                sub: `${conversionRate}% conversion`,
                icon: <CheckCircle2 size={16} />,
                color: 'text-emerald-600',
                bg: 'bg-emerald-50',
              },
              {
                label: 'This Month',
                value: fmtINR(thisMonthValue),
                sub: `${thisMonthQuotes.length} quotes`,
                icon: <Calendar size={16} />,
                color: 'text-violet-600',
                bg: 'bg-violet-50',
              },
            ].map(s => (
              <div key={s.label} className="stat-card group">
                <div className="flex items-start justify-between mb-3.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${s.bg}`}>
                    <span className={s.color}>{s.icon}</span>
                  </div>
                  <ArrowUpRight size={14} className="text-gray-300 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-gray-400" />
                </div>
                <p className="stat-value text-[22px] font-black text-gray-900 tracking-tightest leading-none mb-1.5">{s.value}</p>
                <p className="text-[11px] text-gray-500 font-semibold">{s.label}</p>
                <p className="text-[11px] text-gray-400 mt-0.5 nums">{s.sub}</p>
              </div>
            ))}
          </div>

          {/* Secondary insights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

            {/* Status breakdown — clickable */}
            <div className="card p-5">
              <p className="text-[11px] font-bold text-gray-400 tracking-widest uppercase mb-4">Status</p>
              <div className="grid grid-cols-2 gap-2">
                {(['draft','sent','approved','rejected'] as QuoteStatus[]).map(s => {
                  const n = quotes.filter(q => getStatus(q) === s).length
                  const active = statusFilter === s
                  return (
                    <button key={s} onClick={() => setStatusFilter(prev => prev === s ? 'all' : s)}
                      className={`text-left p-3 rounded-xl border-2 transition-all ${active ? 'border-gray-900 bg-gray-50' : 'border-transparent bg-gray-50/60 hover:bg-gray-50 hover:border-gray-200'}`}>
                      <p className="text-lg font-black text-gray-900 leading-none">{n}</p>
                      <p className="text-[10px] font-semibold text-gray-400 mt-1.5 uppercase tracking-wide">{STATUS_LABELS[s]}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Tier breakdown */}
            <div className="card p-5">
              <p className="text-[11px] font-bold text-gray-400 tracking-widest uppercase mb-4">By Tier</p>
              <div className="space-y-3">
                {Object.entries(byTier).map(([tier, count]) => (
                  <div key={tier}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`${TIER_CLASS[tier] ?? 'badge-draft'} text-[10px]`}>{TIER_LABEL[tier] ?? tier}</span>
                      <span className="text-xs font-bold text-gray-700">{count}</span>
                    </div>
                    <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gray-800 rounded-full transition-all"
                        style={{ width: `${(count / quotes.length) * 100}%` }} />
                    </div>
                  </div>
                ))}
                {Object.keys(byTier).length === 0 && <p className="text-sm text-gray-300">—</p>}
              </div>
            </div>

            {/* Locations */}
            <div className="card p-5">
              <p className="text-[11px] font-bold text-gray-400 tracking-widest uppercase mb-4 flex items-center gap-1.5">
                <MapPin size={11} /> Locations
              </p>
              <div className="space-y-2.5">
                {Object.entries(locCount).sort((a,b) => b[1]-a[1]).slice(0,5).map(([loc, n], i) => (
                  <div key={loc} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] text-gray-300 font-semibold w-3">{i+1}</span>
                      <span className="text-sm text-gray-700 truncate font-medium">{loc}</span>
                    </div>
                    <span className="text-xs font-bold text-gray-400 shrink-0 ml-2">{n}</span>
                  </div>
                ))}
                {Object.keys(locCount).length === 0 && <p className="text-sm text-gray-300">No locations yet</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3 items-start">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-10 text-sm" placeholder="Search client, project, quote #, location…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {statusFilter !== 'all' && (
          <button onClick={() => setStatusFilter('all')}
            className="btn-secondary text-xs gap-2 self-start">
            <Filter size={12} /> {STATUS_LABELS[statusFilter]}
            <XCircle size={12} />
          </button>
        )}
      </div>

      {/* Quote list */}
      {loading ? (
        <div className="space-y-2.5">
          {[1,2,3].map(i => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gray-100 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-gray-100 rounded-lg w-1/3" />
                  <div className="h-3 bg-gray-50 rounded-lg w-1/2" />
                </div>
                <div className="h-3 bg-gray-100 rounded w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileText size={28} className="text-gray-300" />
          </div>
          <p className="text-gray-700 font-bold text-base">
            {search ? 'No results found' : statusFilter !== 'all' ? `No ${STATUS_LABELS[statusFilter].toLowerCase()} quotes` : 'No quotes yet'}
          </p>
          <p className="text-gray-400 text-sm mt-1">
            {!search && statusFilter === 'all' ? 'Create your first quote to get started' : search ? 'Try a different search term' : ''}
          </p>
          {!search && statusFilter === 'all' && (
            <a href="/quotes/new" className="btn-primary mt-6 inline-flex">
              <Plus size={15} /> Create first quote
            </a>
          )}
        </div>
      ) : (
        <div className="space-y-2">
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
    <div className="card-hover p-4 flex flex-col sm:flex-row sm:items-center gap-4 group">

      {/* Status icon */}
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${STATUS_ICON_COLORS[status]}`}>
        <FileText size={17} />
      </div>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="font-bold text-gray-900 text-sm">{quote.clientName}</span>
          <span className="text-[10px] font-semibold text-gray-300 font-mono">{quote.quoteNumber}</span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100">
            {quote.company ?? 'STC'}
          </span>
          <span className={`${TIER_CLASS[quote.priceTier] ?? 'badge-draft'}`}>
            {TIER_LABEL[quote.priceTier]}
          </span>

          {/* Status dropdown */}
          <div className="relative">
            <button onClick={() => setShowStatusMenu(v => !v)}
              className={`${STATUS_CLASS[status]} flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity`}>
              {STATUS_ICONS[status]}
              {STATUS_LABELS[status]}
              <ChevronDown size={9} />
            </button>
            {showStatusMenu && (
              <div className="absolute top-full left-0 mt-1.5 w-36 bg-white border border-gray-200 rounded-xl shadow-xl z-10 py-1.5 overflow-hidden">
                {(['draft','sent','approved','rejected'] as QuoteStatus[]).map(s => (
                  <button key={s} onClick={() => { onStatusChange(s); setShowStatusMenu(false) }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 flex items-center gap-2 font-medium text-gray-700">
                    {STATUS_ICONS[s]} {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {grandTotal > 0 && (
            <span className="font-black text-gray-900 text-sm">{fmtINR(grandTotal)}</span>
          )}
        </div>

        {quote.projectName && (
          <p className="text-sm text-gray-500 truncate">{quote.projectName}</p>
        )}

        <div className="flex items-center gap-3.5 mt-1.5 text-[11px] text-gray-400 flex-wrap font-medium">
          <span className="flex items-center gap-1"><Calendar size={10} />{date}</span>
          {quote.location && <span className="flex items-center gap-1"><MapPin size={10} />{quote.location}</span>}
          <span>{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
          {isExpiring && (
            <span className="flex items-center gap-1 text-amber-500 font-semibold">
              <AlertCircle size={10} /> Expiring soon
            </span>
          )}
          {quote.includeGst && <span className="text-gray-300">GST incl.</span>}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
        <a href={`/quotes/${quote.id}/client`} className="btn-primary text-xs px-3 py-2 gap-1.5">
          <Eye size={12} /> View PDF
        </a>
        <a href={`/quotes/${quote.id}/team`} className="btn-secondary text-xs px-3 py-2 gap-1.5">
          <Users size={12} /> Team
        </a>
        <a href={`/quotes/${quote.id}/edit`} className="btn-ghost text-xs px-2.5 py-2" title="Edit">
          <Edit3 size={13} />
        </a>
        <button onClick={onDuplicate} disabled={duplicating}
          className="btn-ghost text-xs px-2.5 py-2" title="Duplicate">
          <Copy size={13} />
        </button>
        <button onClick={onDelete} disabled={deleting}
          className="btn-ghost text-xs px-2.5 py-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50" title="Delete">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}
