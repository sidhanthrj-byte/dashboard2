'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Save, Loader2, CheckCircle } from 'lucide-react'
import { v4 as uuid } from 'uuid'
import { useRouter } from 'next/navigation'
import CeilingItemForm, { defaultItem } from './CeilingItemForm'
import type { Quote, CeilingItem, PriceTier } from '@/lib/types'
import { calculateQuote, fmtINR } from '@/lib/calculations'

interface Props {
  initial?: Quote
  mode: 'new' | 'edit'
}

export default function QuoteBuilder({ initial, mode }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const today = new Date().toISOString().split('T')[0]
  const validUntil = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]

  const [meta, setMeta] = useState({
    clientName: initial?.clientName ?? '',
    projectName: initial?.projectName ?? '',
    location: initial?.location ?? '',
    date: initial?.date ?? today,
    validUntil: initial?.validUntil ?? validUntil,
    priceTier: (initial?.priceTier ?? 'msp') as PriceTier,
    markupPercent: initial?.markupPercent ?? 0,
    installationCharge: initial?.installationCharge ?? 0,
    notes: initial?.notes ?? '',
  })

  const [items, setItems] = useState<CeilingItem[]>(
    initial?.items?.length ? initial.items : [defaultItem(uuid())]
  )

  // Live preview calculation
  const [preview, setPreview] = useState<{ total: number; items: number } | null>(null)

  const updatePreview = useCallback(() => {
    const fakeQuote: Quote = {
      id: '',
      quoteNumber: '',
      createdAt: '',
      updatedAt: '',
      ...meta,
      items,
    }
    const bd = calculateQuote(fakeQuote)
    setPreview({ total: bd.grandTotal, items: items.length })
  }, [meta, items])

  useEffect(() => {
    updatePreview()
  }, [updatePreview])

  function addItem() {
    setItems(prev => [...prev, defaultItem(uuid())])
  }

  function updateItem(idx: number, item: CeilingItem) {
    setItems(prev => prev.map((p, i) => i === idx ? item : p))
  }

  function removeItem(idx: number) {
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  async function handleSave() {
    if (!meta.clientName.trim()) {
      alert('Please enter a client name.')
      return
    }
    if (items.length === 0) {
      alert('Please add at least one ceiling item.')
      return
    }

    setSaving(true)
    const payload = { ...meta, items }

    const url = mode === 'edit' ? `/api/quotes/${initial!.id}` : '/api/quotes'
    const method = mode === 'edit' ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const saved = await res.json()
    setSaving(false)
    setSaved(true)
    setTimeout(() => {
      router.push(`/quotes/${saved.id}/team`)
    }, 800)
  }

  const TIER_OPTIONS: { value: PriceTier; label: string; desc: string }[] = [
    { value: 'dealer', label: 'Dealer', desc: 'Dealer pricing' },
    { value: 'msp', label: 'MSP', desc: 'Market selling price' },
    { value: 'specifiors', label: 'Specifiors', desc: 'Architects / Specifiers' },
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Main form */}
      <div className="lg:col-span-2 space-y-6">

        {/* Project details card */}
        <div className="card p-6">
          <h2 className="font-semibold text-slate-800 mb-5 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center">1</span>
            Project Details
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Client Name *</label>
              <input className="input" placeholder="ABC Corporation"
                value={meta.clientName} onChange={e => setMeta(m => ({ ...m, clientName: e.target.value }))} />
            </div>
            <div>
              <label className="label">Project Name</label>
              <input className="input" placeholder="Office Renovation"
                value={meta.projectName} onChange={e => setMeta(m => ({ ...m, projectName: e.target.value }))} />
            </div>
            <div>
              <label className="label">Location</label>
              <input className="input" placeholder="Mumbai"
                value={meta.location} onChange={e => setMeta(m => ({ ...m, location: e.target.value }))} />
            </div>
            <div>
              <label className="label">Quote Date</label>
              <input type="date" className="input"
                value={meta.date} onChange={e => setMeta(m => ({ ...m, date: e.target.value }))} />
            </div>
            <div>
              <label className="label">Valid Until</label>
              <input type="date" className="input"
                value={meta.validUntil} onChange={e => setMeta(m => ({ ...m, validUntil: e.target.value }))} />
            </div>
          </div>
        </div>

        {/* Pricing config */}
        <div className="card p-6">
          <h2 className="font-semibold text-slate-800 mb-5 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center">2</span>
            Pricing
          </h2>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {TIER_OPTIONS.map(t => (
              <button
                key={t.value}
                type="button"
                onClick={() => setMeta(m => ({ ...m, priceTier: t.value }))}
                className={`p-3 rounded-xl border text-left transition-all ${
                  meta.priceTier === t.value
                    ? 'border-amber-400 bg-amber-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className={`font-semibold text-sm ${meta.priceTier === t.value ? 'text-amber-800' : 'text-slate-800'}`}>
                  {t.label}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">{t.desc}</div>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Additional Markup (%)</label>
              <input type="number" min="0" max="200" className="input"
                value={meta.markupPercent}
                onChange={e => setMeta(m => ({ ...m, markupPercent: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div>
              <label className="label">Installation Charge (₹)</label>
              <input type="number" min="0" className="input"
                value={meta.installationCharge}
                onChange={e => setMeta(m => ({ ...m, installationCharge: parseFloat(e.target.value) || 0 }))} />
            </div>
          </div>
        </div>

        {/* Ceiling items */}
        <div>
          <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center">3</span>
            Ceiling Items
          </h2>
          <div className="space-y-4">
            {items.map((item, idx) => (
              <CeilingItemForm
                key={item.id}
                item={item}
                index={idx}
                onChange={updated => updateItem(idx, updated)}
                onRemove={() => removeItem(idx)}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={addItem}
            className="mt-4 w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-500 text-sm font-medium hover:border-amber-300 hover:text-amber-600 hover:bg-amber-50 transition-all flex items-center justify-center gap-2"
          >
            <Plus size={16} /> Add Ceiling Item
          </button>
        </div>

        {/* Notes */}
        <div className="card p-6">
          <label className="label">Quote Notes / Terms</label>
          <textarea className="input resize-none h-24"
            placeholder="Any special notes, terms, or conditions for this quote…"
            value={meta.notes}
            onChange={e => setMeta(m => ({ ...m, notes: e.target.value }))} />
        </div>
      </div>

      {/* Sidebar: live summary */}
      <div className="lg:col-span-1">
        <div className="sticky top-24 space-y-4">
          {/* Summary card */}
          <div className="card p-5">
            <h3 className="font-semibold text-slate-800 mb-4">Quote Summary</h3>
            {preview ? (
              <>
                <div className="space-y-2 mb-4">
                  {items.map((item, idx) => {
                    const fakeQ: Quote = { id: '', quoteNumber: '', createdAt: '', updatedAt: '', ...meta, items: [item] }
                    const bd = calculateQuote(fakeQ)
                    return (
                      <div key={item.id} className="flex justify-between items-center text-sm py-1.5 border-b border-slate-100 last:border-0">
                        <span className="text-slate-600 truncate max-w-[60%]">
                          {item.name || `Item ${idx + 1}`}
                        </span>
                        <span className="font-semibold text-slate-800">{fmtINR(bd.grandTotal)}</span>
                      </div>
                    )
                  })}
                </div>
                {meta.installationCharge > 0 && (
                  <div className="flex justify-between text-sm py-1.5 text-slate-500">
                    <span>Installation</span>
                    <span>{fmtINR(meta.installationCharge)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-3 border-t border-slate-200 mt-2">
                  <span className="font-bold text-slate-900">Total</span>
                  <span className="text-xl font-bold text-amber-600">{fmtINR(preview.total)}</span>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  {meta.priceTier.toUpperCase()} pricing
                  {meta.markupPercent > 0 ? ` + ${meta.markupPercent}% markup` : ''}
                  {' · '}Excl. GST
                </p>
              </>
            ) : (
              <p className="text-sm text-slate-400">Add items to see summary</p>
            )}
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving || saved}
            className={`w-full btn text-sm py-3 font-semibold justify-center ${
              saved ? 'bg-green-500 text-white' : 'btn-primary'
            }`}
          >
            {saving ? (
              <><Loader2 size={16} className="animate-spin" /> Saving…</>
            ) : saved ? (
              <><CheckCircle size={16} /> Saved! Redirecting…</>
            ) : (
              <><Save size={16} /> {mode === 'edit' ? 'Update Quote' : 'Save Quote'}</>
            )}
          </button>

          {mode === 'edit' && (
            <a href="/" className="btn-secondary w-full justify-center text-sm">
              Cancel
            </a>
          )}

          {/* Quick tips */}
          <div className="card p-4 bg-blue-50 border-blue-100">
            <p className="text-xs font-semibold text-blue-800 mb-2">Smart Calculations</p>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• Fabric roll optimised to minimise wastage</li>
              <li>• LED strips = 1 per 6 inches of cove depth</li>
              <li>• Drivers auto-selected with 20% headroom</li>
              <li>• Tunable: DT8 + DA4m · Dimmable: DALI 2</li>
              <li>• Circle quoted as diameter × diameter square</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
