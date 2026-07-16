'use client'

import { useEffect, useState } from 'react'
import { GitBranch, ArrowLeft, Plus } from 'lucide-react'
import type { Quote } from '@/lib/types'
import { fmtINR, calculateQuote } from '@/lib/calculations'

export default function RevisionTrailPage({ params }: { params: { id: string } }) {
  const [revs, setRevs] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  function load() {
    fetch(`/api/quotes/${params.id}/revisions`)
      .then(async r => {
        if (!r.ok) { setError(r.status === 403 ? 'You don’t have access to this quote.' : 'Not found'); return [] }
        return r.json()
      })
      .then(d => { setRevs(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function createRevision() {
    setCreating(true)
    const res = await fetch(`/api/quotes/${params.id}/revisions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}),
    })
    setCreating(false)
    if (!res.ok) { alert('Could not create revision'); return }
    const created = await res.json()
    window.location.href = `/quotes/${created.id}/edit`
  }

  function total(q: Quote): number {
    try { return calculateQuote(q).grandTotal } catch { return Number(q.grandTotal ?? 0) }
  }

  const original = revs[0]

  return (
    <div className="animate-fade-in max-w-3xl mx-auto">
      <header className="pt-8 sm:pt-12 pb-6">
        <a href="/quotes" className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-800 mb-4">
          <ArrowLeft size={13} /> Back to quotes
        </a>
        <div className="label mb-2">Revision trail</div>
        <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
          {original ? original.clientName : 'Quote history'}
        </h1>
        <p className="text-sm text-stone-500 mt-2">
          {loading ? 'Loading…' : `${revs.length} version${revs.length !== 1 ? 's' : ''} in this trail`}
        </p>
      </header>

      {error && <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</div>}

      {!loading && !error && (
        <div className="flex items-center justify-end mb-4">
          <button onClick={createRevision} disabled={creating} className="btn-primary">
            <Plus size={15} /> {creating ? 'Creating…' : 'New revision'}
          </button>
        </div>
      )}

      {/* Trail: Main → R1 → R2 … */}
      <div className="relative">
        {revs.map((q, i) => {
          const rev = Number(q.revision ?? 0)
          const isLast = i === revs.length - 1
          return (
            <div key={q.id} className="flex gap-4">
              {/* Rail */}
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-[1.5px] ${rev === 0 ? 'border-stone-900' : 'border-emerald-600'}`}>
                  {rev === 0 ? <span className="text-[11px] font-bold text-stone-900">M</span>
                    : <GitBranch size={14} className="text-emerald-600" />}
                </div>
                {!isLast && <div className="w-px flex-1 my-1 bg-stone-200" />}
              </div>

              {/* Card */}
              <div className="flex-1 pb-6">
                <div className="card p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-stone-500 tabular-nums">{q.quoteNumber}</div>
                      <div className="text-[15px] font-bold text-stone-900 mt-0.5">
                        {rev === 0 ? 'Original quote' : `Revision ${rev}`}
                      </div>
                    </div>
                    <div className="text-[15px] font-black text-stone-900 tabular-nums">{fmtINR(total(q))}</div>
                  </div>
                  <div className="flex items-center gap-3 mt-3 text-xs text-stone-500">
                    <span className="tabular-nums">{new Date(q.updatedAt ?? q.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    {q.revisedBy && <><span className="text-stone-300">·</span><span>by {q.revisedBy}</span></>}
                    {rev === 0 && q.ownerEmail && <><span className="text-stone-300">·</span><span>by {q.ownerEmail}</span></>}
                    <span className="text-stone-300">·</span>
                    <span className="tabular-nums">{q.items?.length ?? 0} items</span>
                  </div>
                  <div className="flex items-center gap-1 mt-3">
                    <a href={`/quotes/${q.id}/team`} className="btn-ghost px-2.5 py-1.5 text-xs">Open</a>
                    <a href={`/quotes/${q.id}/edit`} className="btn-ghost px-2.5 py-1.5 text-xs">Edit</a>
                    <a href={`/quotes/${q.id}/client`} className="btn-ghost px-2.5 py-1.5 text-xs">PDF</a>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
