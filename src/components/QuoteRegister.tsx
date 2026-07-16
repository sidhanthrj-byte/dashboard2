'use client'

import { useEffect, useState, useCallback } from 'react'
import { Search, Plus, Trash2, Copy, ChevronDown, Check, GitBranch, History } from 'lucide-react'
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
const STATUS_DOT: Record<QuoteStatus, string> = {
  draft: 'bg-stone-400', sent: 'bg-blue-500', approved: 'bg-emerald-500', rejected: 'bg-rose-500',
}

function getStatus(quote: Quote): QuoteStatus {
  return ((quote as unknown as Record<string, unknown>).status as QuoteStatus) ?? 'draft'
}

// Shared register used by both the Dashboard (`/`) and the Quotes module
// (`/quotes`). Ownership scoping is enforced server-side, so a standard user's
// list already contains only their own quotes.
export default function QuoteRegister({ variant = 'dashboard' }: { variant?: 'dashboard' | 'quotes' }) {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [duplicating, setDuplicating] = useState<string | null>(null)
  const [revising, setRevising] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | 'all'>('all')
  const [companyFilter, setCompanyFilter] = useState<string>('all')
  const [me, setMe] = useState<{ name?: string; role?: string; email?: string; isAdmin?: boolean } | null>(null)
  const isAdmin = !!me?.isAdmin

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

  const thisMonth = new Date().toISOString().slice(0, 7)
  const thisMonthValue = quotes.filter(q => q.date?.startsWith(thisMonth))
    .reduce((s, q) => { try { return s + calculateQuote(q).grandTotal } catch { return s } }, 0)
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
  const recentCount = quotes.filter(q => q.date >= sevenDaysAgo).length
  const approvedValue = quotes.filter(q => getStatus(q) === 'approved')
    .reduce((s, q) => { try { return s + calculateQuote(q).grandTotal } catch { return s } }, 0)
  const conversionRate = quotes.length > 0
    ? Math.round((quotes.filter(q => getStatus(q) === 'approved').length / quotes.length) * 100)
    : 0

  const statusCounts = (['draft', 'sent', 'approved', 'rejected'] as QuoteStatus[])
    .map(s => ({ s, n: quotes.filter(q => getStatus(q) === s).length }))

  const filtered = statusFilter === 'all' ? quotes : quotes.filter(q => getStatus(q) === statusFilter)
  const showStats = !loading && quotes.length > 0 && !search

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

  // Create a linked revision (never overwrites the original) then open it for editing.
  async function reviseQuote(quote: Quote) {
    setRevising(quote.id)
    const res = await fetch(`/api/quotes/${quote.id}/revisions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}),
    })
    setRevising(null)
    if (!res.ok) { alert('Could not create revision'); return }
    const created = await res.json()
    window.location.href = `/quotes/${created.id}/edit`
  }

  const companies = [{ id: 'all', label: 'All' }, ...listCompanies().map(c => ({ id: c.id, label: c.shortName }))]
  const firstName = me?.name ? me.name.split(' ')[0] : null

  const metrics = [
    { label: isAdmin ? 'Total Quotes' : 'My Quotes', value: String(quotes.length) },
    { label: 'Pipeline Value', value: fmtINR(totals.value) },
    { label: 'Won', value: fmtINR(approvedValue), meta: `${conversionRate}% conversion` },
    { label: 'This Month', value: fmtINR(thisMonthValue) },
  ]

  const heading = variant === 'quotes'
    ? (firstName && !isAdmin ? `${firstName}'s Quotes` : 'Quotes')
    : (isAdmin ? 'Quotations' : firstName ? `${firstName}'s Desk` : 'My Quotations')

  return (
    <div className="animate-fade-in">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">{heading}</h1>
          <p className="text-sm text-stone-500 mt-1">
            {loading ? 'Loading…'
              : quotes.length === 0 ? 'No quotations yet'
              : `${quotes.length} quotation${quotes.length !== 1 ? 's' : ''}${recentCount > 0 ? ` · ${recentCount} this week` : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-stone-100 rounded-xl p-0.5">
            {companies.map(c => (
              <button key={c.id} onClick={() => setCompanyFilter(c.id)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                  companyFilter === c.id ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-800'
                }`}>{c.label}</button>
            ))}
          </div>
          <a href="/quotes/new" className="btn-primary text-sm"><Plus size={16} /> New Quote</a>
        </div>
      </div>

      {/* Stat cards */}
      {showStats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {metrics.map(m => (
            <div key={m.label} className="stat-card">
              <p className="label mb-1">{m.label}</p>
              <p className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight tabular-nums">{m.value}</p>
              {m.meta && <p className="text-[11px] text-stone-400 font-medium mt-1">{m.meta}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            className="input pl-9"
            placeholder="Search quotations…"
            value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>
        {showStats && (
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button onClick={() => setStatusFilter('all')}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                statusFilter === 'all' ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}>All</button>
            {statusCounts.map(({ s, n }) => (
              <button key={s} onClick={() => setStatusFilter(prev => prev === s ? 'all' : s)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap flex items-center gap-1.5 transition-colors ${
                  statusFilter === s ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[s]}`} />
                {STATUS_LABELS[s]}<span className="text-stone-400">{n}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Body */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="card p-4 flex items-center gap-4">
              <div className="flex-1 space-y-2.5"><div className="skeleton h-3.5 w-52 rounded" /><div className="skeleton h-2.5 w-32 rounded" /></div>
              <div className="skeleton h-3.5 w-20 rounded" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card py-20 text-center">
          <p className="font-bold text-stone-900 text-lg">
            {search ? 'Nothing matches that' : statusFilter !== 'all' ? `No ${STATUS_LABELS[statusFilter].toLowerCase()} quotes` : 'No quotations yet'}
          </p>
          <p className="text-sm text-stone-500 mt-2">
            {!search && statusFilter === 'all' ? 'Create your first quotation to get started.' : search ? 'Try a different term.' : "They'll be listed here."}
          </p>
          {!search && statusFilter === 'all' && (
            <a href="/quotes/new" className="btn-primary mt-6 inline-flex text-sm"><Plus size={16} /> New Quote</a>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(quote => (
            <QuoteRow key={quote.id} quote={quote}
              deleting={deleting === quote.id} duplicating={duplicating === quote.id} revising={revising === quote.id}
              onDelete={() => deleteQuote(quote.id, quote.clientName)}
              onDuplicate={() => duplicateQuote(quote)}
              onRevise={() => reviseQuote(quote)}
              onStatusChange={s => updateStatus(quote.id, s)} />
          ))}
        </div>
      )}
    </div>
  )
}

function QuoteRow({ quote, deleting, duplicating, revising, onDelete, onDuplicate, onRevise, onStatusChange }: {
  quote: Quote
  deleting: boolean
  duplicating: boolean
  revising: boolean
  onDelete: () => void
  onDuplicate: () => void
  onRevise: () => void
  onStatusChange: (s: QuoteStatus) => void
}) {
  const [menu, setMenu] = useState(false)
  const status = getStatus(quote)
  const date = new Date(quote.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
  const itemCount = quote.items?.length ?? 0
  const rev = Number(quote.revision ?? 0)
  let grandTotal = 0
  try { grandTotal = calculateQuote(quote).grandTotal } catch {}

  return (
    <div className="group card-hover p-4 flex items-center gap-4">
      {/* Client / project */}
      <a href={`/quotes/${quote.id}/team`} className="flex-1 min-w-0 block">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-stone-900 truncate">{quote.clientName}</span>
          {rev > 0 && (
            <span className="text-[10px] font-semibold uppercase shrink-0 px-1.5 py-0.5 rounded border border-stone-200 text-emerald-700 tracking-wide">
              Rev {rev}
            </span>
          )}
          <span className="text-[11px] text-stone-400 font-medium shrink-0">{date}</span>
        </div>
        <div className="flex items-center gap-2 mt-1 text-xs text-stone-500">
          {quote.projectName && <span className="truncate">{quote.projectName}</span>}
          {quote.projectName && quote.location && <span className="text-stone-300">·</span>}
          {quote.location && <span className="truncate">{quote.location}</span>}
          <span className="text-stone-300">·</span>
          <span className="shrink-0">{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
        </div>
      </a>

      {/* Ref / tier */}
      <div className="hidden md:block w-28 shrink-0">
        <div className="text-xs font-semibold text-stone-600 tabular-nums">{quote.quoteNumber}</div>
        <div className="mt-1"><span className={TIER_CLASS[quote.priceTier] ?? 'badge-dealer'}>{quote.company ?? 'STC'} · {TIER_LABEL[quote.priceTier] ?? quote.priceTier}</span></div>
      </div>

      {/* Status callout */}
      <div className="relative shrink-0 w-24 hidden sm:block">
        <button onClick={() => setMenu(v => !v)}
          className={`${STATUS_CLASS[status]} hover:opacity-80 transition-opacity`}>
          <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[status]}`} />
          {STATUS_LABELS[status]}
          <ChevronDown size={11} />
        </button>
        {menu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
            <div className="absolute top-full left-0 mt-1 w-40 rounded-xl z-20 py-1 bg-white border border-stone-200 shadow-lg animate-scale-in origin-top-left">
              {(['draft', 'sent', 'approved', 'rejected'] as QuoteStatus[]).map(s => (
                <button key={s} onClick={() => { onStatusChange(s); setMenu(false) }}
                  className="w-full text-left px-3 py-1.5 text-xs font-semibold flex items-center gap-2 text-stone-600 hover:bg-stone-50 transition-colors">
                  <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[s]}`} />
                  <span className="flex-1">{STATUS_LABELS[s]}</span>
                  {s === status && <Check size={12} className="text-emerald-600" />}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Amount */}
      <div className="text-sm font-black text-stone-900 text-right w-28 shrink-0 tabular-nums">
        {grandTotal > 0 ? fmtINR(grandTotal) : '—'}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5 shrink-0 w-[136px] justify-end sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-150">
        <a href={`/quotes/${quote.id}/revisions`} className="btn-ghost px-1.5 py-1.5" title="Revision trail"><History size={14} /></a>
        <a href={`/quotes/${quote.id}/client`} className="btn-ghost px-2 py-1.5 text-xs">PDF</a>
        <a href={`/quotes/${quote.id}/edit`} className="btn-ghost px-2 py-1.5 text-xs">Edit</a>
        <button onClick={onRevise} disabled={revising} className="btn-ghost px-1.5 py-1.5" title="Create revision"><GitBranch size={14} /></button>
        <button onClick={onDuplicate} disabled={duplicating} className="btn-ghost px-1.5 py-1.5" title="Duplicate"><Copy size={14} /></button>
        <button onClick={onDelete} disabled={deleting} className="btn-ghost px-1.5 py-1.5 text-rose-500" title="Delete"><Trash2 size={14} /></button>
      </div>
    </div>
  )
}
