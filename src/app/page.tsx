'use client'

import { useEffect, useState, useCallback } from 'react'
import { Search, Plus, Trash2, Copy, ChevronDown, Check } from 'lucide-react'
import type { Quote } from '@/lib/types'
import { fmtINR, calculateQuote } from '@/lib/calculations'
import { listCompanies } from '@/lib/companies'

const TIER_LABEL: Record<string, string> = { dealer: 'Dealer', msp: 'MSP', specifiors: 'Specifiors' }

type QuoteStatus = 'draft' | 'sent' | 'approved' | 'rejected'
const STATUS_LABELS: Record<QuoteStatus, string> = { draft: 'Draft', sent: 'Sent', approved: 'Approved', rejected: 'Rejected' }
const STATUS_DOT: Record<QuoteStatus, string> = {
  draft: 'var(--faint)', sent: 'var(--slate)', approved: 'var(--forest)', rejected: 'var(--accent)',
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

  const companies = [{ id: 'all', label: 'All' }, ...listCompanies().map(c => ({ id: c.id, label: c.shortName }))]
  const firstName = me?.name ? me.name.split(' ')[0] : null

  const metrics = [
    { label: isAdmin ? 'Quotes on file' : 'My quotes', value: String(quotes.length) },
    { label: 'Pipeline', value: fmtINR(totals.value) },
    { label: 'Won', value: fmtINR(approvedValue), meta: `${conversionRate}% conv.` },
    { label: 'This month', value: fmtINR(thisMonthValue) },
  ]

  return (
    <div className="animate-fade-in">

      {/* Register header */}
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5 pt-8 sm:pt-12 pb-7">
        <div>
          <div className="eyebrow mb-2.5">Register</div>
          <h1 className="font-display text-[32px] sm:text-[38px] font-semibold leading-none tracking-tight" style={{ color: 'var(--ink)' }}>
            {isAdmin ? 'Quotations' : firstName ? `${firstName}’s desk` : 'My quotations'}
          </h1>
          <p className="text-[14px] mt-3" style={{ color: 'var(--muted)' }}>
            {loading ? 'Loading…'
              : quotes.length === 0 ? 'No records yet'
              : `${quotes.length} record${quotes.length !== 1 ? 's' : ''}${recentCount > 0 ? ` · ${recentCount} this week` : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center" style={{ borderBottom: '1px solid var(--rule)' }}>
            {companies.map(c => (
              <button key={c.id} onClick={() => setCompanyFilter(c.id)}
                className={`seg ${companyFilter === c.id ? 'seg-on' : ''}`}>{c.label}</button>
            ))}
          </div>
          <a href="/quotes/new" className="btn-primary"><Plus size={15} /> New quote</a>
        </div>
      </header>

      {/* Title-block metrics strip */}
      {showStats && (
        <section className="grid grid-cols-2 md:grid-cols-4"
          style={{ borderTop: '1px solid var(--rule-2)', borderBottom: '1px solid var(--rule-2)' }}>
          {metrics.map((m, i) => (
            <div key={m.label} className="py-5 pr-6"
              style={{ borderLeft: i === 0 ? 'none' : '1px solid var(--rule)', paddingLeft: i === 0 ? 0 : '1.5rem' }}>
              <div className="label mb-2" style={{ marginBottom: 8 }}>{m.label}</div>
              <div className="fig text-[24px] sm:text-[26px] font-medium leading-none" style={{ color: 'var(--ink)' }}>{m.value}</div>
              {m.meta && <div className="fig text-[11px] mt-2" style={{ color: 'var(--faint)' }}>{m.meta}</div>}
            </div>
          ))}
        </section>
      )}

      {/* Controls */}
      <div className="flex items-center justify-between gap-4 mt-9 mb-1">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-0 top-1/2 -translate-y-1/2" style={{ color: 'var(--faint)' }} />
          <input
            className="w-full bg-transparent border-0 pl-6 pr-3 py-2.5 text-[14px] focus:outline-none"
            style={{ color: 'var(--ink)' }}
            placeholder="Search records…"
            value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>
        {showStats && (
          <div className="hidden sm:flex items-center" style={{ borderBottom: '1px solid var(--rule)' }}>
            <button onClick={() => setStatusFilter('all')} className={`seg ${statusFilter === 'all' ? 'seg-on' : ''}`}>All</button>
            {statusCounts.map(({ s, n }) => (
              <button key={s} onClick={() => setStatusFilter(prev => prev === s ? 'all' : s)}
                className={`seg flex items-center gap-1.5 ${statusFilter === s ? 'seg-on' : ''}`}>
                <span className="w-1.5 h-1.5 rounded-[1px]" style={{ background: STATUS_DOT[s] }} />
                {STATUS_LABELS[s]}<span className="fig text-[11px]" style={{ color: 'var(--faint)' }}>{n}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Ledger column header */}
      {!loading && filtered.length > 0 && (
        <div className="hidden md:flex items-center gap-4 px-3 py-2" style={{ borderBottom: '1px solid var(--rule-2)' }}>
          <div className="flex-1 label mb-0">Client / Project</div>
          <div className="w-28 label mb-0">Ref · Tier</div>
          <div className="w-24 label mb-0">Status</div>
          <div className="w-28 label mb-0 text-right">Amount</div>
          <div className="w-[104px]" />
        </div>
      )}

      {/* Ledger body */}
      {loading ? (
        <div>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex items-center gap-4 py-4 px-3" style={{ borderBottom: '1px solid var(--rule)' }}>
              <div className="flex-1 space-y-2.5"><div className="skeleton h-3.5 w-52" /><div className="skeleton h-2.5 w-32" /></div>
              <div className="skeleton h-3.5 w-20" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-24 text-center">
          <div className="fig text-[11px] uppercase mb-3" style={{ color: 'var(--faint)', letterSpacing: '0.14em' }}>
            {search ? 'No matches' : statusFilter !== 'all' ? 'Empty view' : 'Blank sheet'}
          </div>
          <p className="font-display text-[19px] font-semibold" style={{ color: 'var(--ink)' }}>
            {search ? 'Nothing matches that' : statusFilter !== 'all' ? `No ${STATUS_LABELS[statusFilter].toLowerCase()} quotes` : 'No quotations yet'}
          </p>
          <p className="text-[13.5px] mt-2" style={{ color: 'var(--muted)' }}>
            {!search && statusFilter === 'all' ? 'Draw up your first quotation to begin the register.' : search ? 'Try a different term.' : 'They’ll be listed here.'}
          </p>
          {!search && statusFilter === 'all' && (
            <a href="/quotes/new" className="btn-primary mt-6 inline-flex"><Plus size={15} /> New quote</a>
          )}
        </div>
      ) : (
        <div>
          {filtered.map(quote => (
            <QuoteRow key={quote.id} quote={quote}
              deleting={deleting === quote.id} duplicating={duplicating === quote.id}
              onDelete={() => deleteQuote(quote.id, quote.clientName)}
              onDuplicate={() => duplicateQuote(quote)}
              onStatusChange={s => updateStatus(quote.id, s)} />
          ))}
        </div>
      )}
    </div>
  )
}

function QuoteRow({ quote, deleting, duplicating, onDelete, onDuplicate, onStatusChange }: {
  quote: Quote
  deleting: boolean
  duplicating: boolean
  onDelete: () => void
  onDuplicate: () => void
  onStatusChange: (s: QuoteStatus) => void
}) {
  const [menu, setMenu] = useState(false)
  const status = getStatus(quote)
  const date = new Date(quote.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
  const itemCount = quote.items?.length ?? 0
  let grandTotal = 0
  try { grandTotal = calculateQuote(quote).grandTotal } catch {}

  return (
    <div className="group flex items-center gap-4 py-4 px-3 transition-colors duration-150 hover:bg-[color:var(--sheet)]"
      style={{ borderBottom: '1px solid var(--rule)' }}>
      {/* Client / project */}
      <a href={`/quotes/${quote.id}/team`} className="flex-1 min-w-0 block">
        <div className="flex items-baseline gap-2.5">
          <span className="text-[14.5px] font-medium truncate" style={{ color: 'var(--ink)' }}>{quote.clientName}</span>
          <span className="fig text-[11px] shrink-0" style={{ color: 'var(--faint)' }}>{date}</span>
        </div>
        <div className="flex items-center gap-2 mt-1 text-[12.5px]" style={{ color: 'var(--muted)' }}>
          {quote.projectName && <span className="truncate">{quote.projectName}</span>}
          {quote.projectName && quote.location && <span style={{ color: 'var(--rule-2)' }}>·</span>}
          {quote.location && <span className="truncate">{quote.location}</span>}
          <span style={{ color: 'var(--rule-2)' }}>·</span>
          <span className="fig shrink-0 text-[11px]">{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
        </div>
      </a>

      {/* Ref / tier */}
      <div className="hidden md:block w-28 shrink-0">
        <div className="fig text-[11.5px]" style={{ color: 'var(--ink-3)' }}>{quote.quoteNumber}</div>
        <div className="fig text-[10px] uppercase mt-1" style={{ color: 'var(--faint)', letterSpacing: '0.06em' }}>
          {quote.company ?? 'STC'} · {TIER_LABEL[quote.priceTier] ?? quote.priceTier}
        </div>
      </div>

      {/* Status callout */}
      <div className="relative shrink-0 w-24 hidden sm:block">
        <button onClick={() => setMenu(v => !v)}
          className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase px-1.5 py-1 rounded-[2px] transition-colors hover:bg-[color:var(--sheet-2)]"
          style={{ color: 'var(--ink-2)', letterSpacing: '0.05em' }}>
          <span className="w-1.5 h-1.5 rounded-[1px]" style={{ background: STATUS_DOT[status] }} />
          {STATUS_LABELS[status]}
          <ChevronDown size={11} style={{ color: 'var(--faint)' }} />
        </button>
        {menu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
            <div className="absolute top-full left-0 mt-1 w-40 rounded-[3px] z-20 py-1 animate-scale-in origin-top-left"
              style={{ background: 'var(--sheet)', border: '1px solid var(--rule-2)', boxShadow: 'var(--shadow-pop, 0 10px 34px -12px rgb(28 25 21 / 0.28))' }}>
              {(['draft', 'sent', 'approved', 'rejected'] as QuoteStatus[]).map(s => (
                <button key={s} onClick={() => { onStatusChange(s); setMenu(false) }}
                  className="w-full text-left px-3 py-1.5 font-mono text-[11px] uppercase flex items-center gap-2 hover:bg-[color:var(--sheet-2)] transition-colors"
                  style={{ color: 'var(--ink-2)', letterSpacing: '0.05em' }}>
                  <span className="w-1.5 h-1.5 rounded-[1px]" style={{ background: STATUS_DOT[s] }} />
                  <span className="flex-1">{STATUS_LABELS[s]}</span>
                  {s === status && <Check size={12} style={{ color: 'var(--accent)' }} />}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Amount */}
      <div className="fig text-[14px] font-medium text-right w-28 shrink-0" style={{ color: 'var(--ink)' }}>
        {grandTotal > 0 ? fmtINR(grandTotal) : '—'}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5 shrink-0 w-[104px] justify-end sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-150">
        <a href={`/quotes/${quote.id}/client`} className="btn-ghost btn-sm">PDF</a>
        <a href={`/quotes/${quote.id}/edit`} className="btn-ghost btn-sm">Edit</a>
        <button onClick={onDuplicate} disabled={duplicating} className="btn-ghost btn-sm px-1.5" title="Duplicate"><Copy size={14} /></button>
        <button onClick={onDelete} disabled={deleting} className="btn-ghost btn-sm px-1.5" title="Delete" style={{ color: 'var(--accent)' }}><Trash2 size={14} /></button>
      </div>
    </div>
  )
}
