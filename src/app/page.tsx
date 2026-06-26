'use client'

import { useEffect, useState, useCallback } from 'react'
import { Search, FileText, Plus, Trash2, Eye, Users, Calendar, MapPin } from 'lucide-react'
import type { Quote } from '@/lib/types'
import { fmtINR } from '@/lib/calculations'

const TIER_LABEL: Record<string, string> = {
  dealer: 'Dealer', msp: 'MSP', specifiors: 'Specifiors',
}

export default function HomePage() {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

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

  async function deleteQuote(id: string, name: string) {
    if (!confirm(`Delete quote for "${name}"? This cannot be undone.`)) return
    setDeleting(id)
    await fetch(`/api/quotes/${id}`, { method: 'DELETE' })
    setQuotes(prev => prev.filter(q => q.id !== id))
    setDeleting(null)
  }

  return (
    <div>
      {/* Header row */}
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

      {/* Search */}
      <div className="relative mb-6">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="input pl-9 max-w-md"
          placeholder="Search by client, project, quote number, location…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Quote list */}
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
              onDelete={() => deleteQuote(quote.id, quote.clientName)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function QuoteCard({ quote, deleting, onDelete }: {
  quote: Quote
  deleting: boolean
  onDelete: () => void
}) {
  const date = new Date(quote.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  const itemCount = quote.items.length

  return (
    <div className="card p-5 flex flex-col sm:flex-row sm:items-center gap-4 group hover:border-amber-200 hover:shadow-md transition-all">
      {/* Left: quote number badge */}
      <div className="shrink-0">
        <div className="w-12 h-12 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-center">
          <FileText size={20} className="text-amber-600" />
        </div>
      </div>

      {/* Middle: info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="font-bold text-slate-900">{quote.clientName}</span>
          <span className="badge bg-slate-100 text-slate-600">{quote.quoteNumber}</span>
          <span className="badge bg-amber-50 text-amber-700 border border-amber-200">
            {TIER_LABEL[quote.priceTier]}
          </span>
        </div>
        <p className="text-sm text-slate-600 font-medium truncate">{quote.projectName}</p>
        <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-400">
          <span className="flex items-center gap-1"><Calendar size={11} />{date}</span>
          {quote.location && <span className="flex items-center gap-1"><MapPin size={11} />{quote.location}</span>}
          <span>{itemCount} ceiling item{itemCount !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Actions */}
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
