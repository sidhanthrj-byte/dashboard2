'use client'

import { useEffect, useState, useCallback } from 'react'
import { Search, FileText, Plus, Trash2, Eye, Users, Calendar, MapPin, Copy, TrendingUp, Hash, BarChart2, IndianRupee, Clock } from 'lucide-react'
import type { Quote } from '@/lib/types'
import { fmtINR, calculateQuote } from '@/lib/calculations'

const TIER_LABEL: Record<string, string> = {
  dealer: 'Dealer', msp: 'MSP', specifiors: 'Specifiors',
}

export default function HomePage() {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [duplicating, setDuplicating] = useState<string | null>(null)

  const fetchQuotes = useCallback(async (q = '') => {
    setLoading(true)
    const res = await fetch(`/api/quotes?q=${encodeURIComponent(q)}`)
    setQuotes(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { fetchQuotes() }, [fetchQuotes])

  useEffect(() => {
    const t = setTimeout(() => fetchQuotes(search), 300)
    return () => clearTimeout(t)
  }, [search, fetchQuotes])

  const totals = quotes.reduce((acc, q) => {
    try {
      const bd = calculateQuote(q)
      acc.value += bd.grandTotal
      acc.sqft += bd.totalSqft ?? 0
      acc.count++
    } catch { /* skip */ }
    return acc
  }, { value: 0, sqft: 0, count: 0 })

  const totalValue = totals.value
  const avgQuoteValue = totals.count > 0 ? totalValue / totals.count : 0

  // Quotes by tier
  const byTier = quotes.reduce<Record<string, number>>((acc, q) => {
    acc[q.priceTier] = (acc[q.priceTier] ?? 0) + 1
    return acc
  }, {})

  // This month's quotes
  const thisMonth = new Date().toISOString().slice(0, 7)
  const thisMonthQuotes = quotes.filter(q => q.date?.startsWith(thisMonth))
  const thisMonthValue = thisMonthQuotes.reduce((sum, q) => {
    try { return sum + calculateQuote(q).grandTotal } catch { return sum }
  }, 0)

  // Top location
  const locCount = quotes.reduce<Record<string, number>>((acc, q) => {
    if (q.location) acc[q.location] = (acc[q.location] ?? 0) + 1
    return acc
  }, {})
  const topLocation = Object.entries(locCount).sort((a, b) => b[1] - a[1])[0]

  // Recent (last 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
  const recentCount = quotes.filter(q => q.date >= sevenDaysAgo).length

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
      clientName: quote.clientName + ' (Copy)',
      date: new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    }
    const res = await fetch('/api/quotes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const created = await res.json()
    setDuplicating(null)
    window.location.href = `/quotes/${created.id}/edit`
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quotations</h1>
          <p className="text-sm text-slate-500 mt-0.5">{quotes.length} quote{quotes.length !== 1 ? 's' : ''} saved</p>
        </div>
        <a href="/quotes/new" className="btn-primary">
          <Plus size={16} />
          New Quote
        </a>
      </div>

      {!loading && quotes.length > 0 && !search && (
        <div className="mb-6 space-y-3">
          {/* Row 1 — key numbers */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="card p-4 flex items-center gap-3">
              <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
                <Hash size={16} className="text-slate-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Total Quotes</p>
                <p className="text-xl font-bold text-slate-900">{quotes.length}</p>
              </div>
            </div>
            <div className="card p-4 flex items-center gap-3">
              <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center shrink-0">
                <TrendingUp size={16} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Pipeline Value</p>
                <p className="text-xl font-bold text-slate-900">{fmtINR(totalValue)}</p>
              </div>
            </div>
            <div className="card p-4 flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                <IndianRupee size={16} className="text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Avg Quote Value</p>
                <p className="text-xl font-bold text-slate-900">{fmtINR(avgQuoteValue)}</p>
              </div>
            </div>
            <div className="card p-4 flex items-center gap-3">
              <div className="w-9 h-9 bg-violet-50 rounded-xl flex items-center justify-center shrink-0">
                <Clock size={16} className="text-violet-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Last 7 Days</p>
                <p className="text-xl font-bold text-slate-900">{recentCount} quote{recentCount !== 1 ? 's' : ''}</p>
              </div>
            </div>
          </div>

          {/* Row 2 — this month + breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="card p-4">
              <p className="text-xs text-slate-500 font-medium mb-1 flex items-center gap-1"><Calendar size={12} /> This Month</p>
              <p className="text-lg font-bold text-slate-900">{fmtINR(thisMonthValue)}</p>
              <p className="text-xs text-slate-400 mt-0.5">{thisMonthQuotes.length} quote{thisMonthQuotes.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-slate-500 font-medium mb-2 flex items-center gap-1"><BarChart2 size={12} /> By Price Tier</p>
              <div className="space-y-1">
                {Object.entries(byTier).map(([tier, count]) => (
                  <div key={tier} className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 capitalize">{TIER_LABEL[tier] ?? tier}</span>
                    <span className="font-semibold text-slate-800">{count}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="card p-4">
              <p className="text-xs text-slate-500 font-medium mb-2 flex items-center gap-1"><MapPin size={12} /> Top Location</p>
              {topLocation ? (
                <>
                  <p className="text-lg font-bold text-slate-900">{topLocation[0]}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{topLocation[1]} quote{topLocation[1] !== 1 ? 's' : ''}</p>
                </>
              ) : (
                <p className="text-sm text-slate-400 italic">—</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="relative mb-6">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="input pl-9 max-w-md"
          placeholder="Search by client, project, quote number, location…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="grid gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-4 bg-slate-100 rounded w-1/3 mb-2" />
              <div className="h-3 bg-slate-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : quotes.length === 0 ? (
        <div className="card p-16 text-center">
          <FileText size={40} className="text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">
            {search ? 'No quotes match your search' : 'No quotes yet'}
          </p>
          {!search && (
            <a href="/quotes/new" className="btn-primary mt-4 inline-flex">
              <Plus size={16} /> Create your first quote
            </a>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          {quotes.map(quote => (
            <QuoteCard
              key={quote.id}
              quote={quote}
              deleting={deleting === quote.id}
              duplicating={duplicating === quote.id}
              onDelete={() => deleteQuote(quote.id, quote.clientName)}
              onDuplicate={() => duplicateQuote(quote)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function QuoteCard({ quote, deleting, duplicating, onDelete, onDuplicate }: {
  quote: Quote
  deleting: boolean
  duplicating: boolean
  onDelete: () => void
  onDuplicate: () => void
}) {
  const date = new Date(quote.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  const itemCount = quote.items.length
  let grandTotal = 0
  try { grandTotal = calculateQuote(quote).grandTotal } catch {}

  return (
    <div className="card p-5 flex flex-col sm:flex-row sm:items-center gap-4 group hover:border-slate-300 hover:shadow-md transition-all">
      <div className="shrink-0">
        <div className="w-12 h-12 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-center">
          <FileText size={20} className="text-slate-600" />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="font-bold text-slate-900">{quote.clientName}</span>
          <span className="badge bg-slate-100 text-slate-600">{quote.quoteNumber}</span>
          <span className="badge bg-slate-50 text-slate-700 border border-slate-200">
            {TIER_LABEL[quote.priceTier]}
          </span>
          {grandTotal > 0 && (
            <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
              {fmtINR(grandTotal)}
            </span>
          )}
        </div>
        <p className="text-sm text-slate-600 font-medium truncate">{quote.projectName}</p>
        <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-400">
          <span className="flex items-center gap-1"><Calendar size={11} />{date}</span>
          {quote.location && <span className="flex items-center gap-1"><MapPin size={11} />{quote.location}</span>}
          <span>{itemCount} ceiling item{itemCount !== 1 ? 's' : ''}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <a href={`/quotes/${quote.id}/team`} className="btn-secondary text-xs gap-1.5">
          <Users size={14} /> Team
        </a>
        <a href={`/quotes/${quote.id}/client`} className="btn-primary text-xs gap-1.5">
          <Eye size={14} /> Client
        </a>
        <a href={`/quotes/${quote.id}/edit`} className="btn-ghost text-xs px-2 py-1.5">
          Edit
        </a>
        <button
          onClick={onDuplicate}
          disabled={duplicating}
          className="btn-ghost text-xs px-2 py-1.5"
          title="Duplicate quote"
        >
          <Copy size={14} />
        </button>
        <button
          onClick={onDelete}
          disabled={deleting}
          className="btn-danger text-xs px-2 py-1.5"
          title="Delete quote"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}
