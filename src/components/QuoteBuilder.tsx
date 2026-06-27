'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Save, Loader2, CheckCircle, BookUser, Trash2 } from 'lucide-react'
import { v4 as uuid } from 'uuid'
import { useRouter } from 'next/navigation'
import CeilingItemForm, { defaultItem } from './CeilingItemForm'
import type { Quote, CeilingItem, PriceTier, QuoteDisplayMode } from '@/lib/types'
import { calculateQuote, fmtINR } from '@/lib/calculations'
import { listClients, saveClient, deleteClient, type SavedClient } from '@/lib/clients'

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
    clientEmail: initial?.clientEmail ?? '',
    clientPhone: initial?.clientPhone ?? '',
    projectName: initial?.projectName ?? '',
    location: initial?.location ?? '',
    date: initial?.date ?? today,
    validUntil: initial?.validUntil ?? validUntil,
    priceTier: (initial?.priceTier ?? 'msp') as PriceTier,
    markupPercent: initial?.markupPercent ?? 0,
    installationRatePerSqft: initial?.installationRatePerSqft ?? 120,
    transportCost: initial?.transportCost ?? 0,
    includeGst: initial?.includeGst ?? false,
    displayMode: (initial?.displayMode ?? 'total') as QuoteDisplayMode,
    notes: initial?.notes ?? '',
  })

  const [items, setItems] = useState<CeilingItem[]>(
    initial?.items?.length ? initial.items : [defaultItem(uuid())]
  )

  const [preview, setPreview] = useState<ReturnType<typeof calculateQuote> | null>(null)
  const [clients, setClients] = useState<SavedClient[]>([])
  const [showClientBook, setShowClientBook] = useState(false)

  useEffect(() => { setClients(listClients()) }, [])

  function loadClient(c: SavedClient) {
    setMeta(m => ({
      ...m,
      clientName: c.name,
      clientEmail: c.email,
      clientPhone: c.phone,
      location: c.location,
      priceTier: c.priceTier as PriceTier,
      markupPercent: c.markupPercent,
    }))
    setShowClientBook(false)
  }

  function saveCurrentClient() {
    if (!meta.clientName.trim()) { alert('Enter a client name first.'); return }
    const existing = clients.find(c => c.name.toLowerCase() === meta.clientName.toLowerCase())
    const client: SavedClient = {
      id: existing?.id ?? uuid(),
      name: meta.clientName,
      email: meta.clientEmail,
      phone: meta.clientPhone,
      location: meta.location,
      priceTier: meta.priceTier,
      markupPercent: meta.markupPercent,
      notes: '',
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    }
    saveClient(client)
    setClients(listClients())
    alert(`Saved "${client.name}" to client book.`)
  }

  function removeClient(id: string) {
    deleteClient(id)
    setClients(listClients())
  }

  const updatePreview = useCallback(() => {
    try {
      const fakeQuote: Quote = {
        id: '', quoteNumber: '', createdAt: '', updatedAt: '',
        ...meta,
        items,
      }
      setPreview(calculateQuote(fakeQuote))
    } catch {
      setPreview(null)
    }
  }, [meta, items])

  useEffect(() => { updatePreview() }, [updatePreview])

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
    if (!meta.clientName.trim()) { alert('Please enter a client name.'); return }
    if (items.length === 0) { alert('Please add at least one ceiling item.'); return }

    setSaving(true)
    const payload = { ...meta, items }
    const url = mode === 'edit' ? `/api/quotes/${initial!.id}` : '/api/quotes'
    const method = mode === 'edit' ? 'PUT' : 'POST'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const savedQ = await res.json()
    setSaving(false)
    setSaved(true)
    setTimeout(() => router.push(`/quotes/${savedQ.id}/team`), 800)
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

        {/* Client Book */}
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <button onClick={() => setShowClientBook(v => !v)}
              className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-900">
              <BookUser size={16} />
              {showClientBook ? 'Hide Client Book' : 'Load from Client Book'}
              {clients.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs">{clients.length}</span>
              )}
            </button>
            <button onClick={saveCurrentClient}
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1">
              <Save size={12} /> Save current client
            </button>
          </div>
          {showClientBook && (
            <div className="mt-3 space-y-1.5 max-h-48 overflow-y-auto">
              {clients.length === 0 && (
                <p className="text-sm text-slate-400 italic">No saved clients yet. Fill in client details above and click &quot;Save current client&quot;.</p>
              )}
              {clients.map(c => (
                <div key={c.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 group">
                  <button onClick={() => loadClient(c)} className="flex-1 text-left">
                    <p className="text-sm font-medium text-slate-800">{c.name}</p>
                    <p className="text-xs text-slate-400">{c.location} · {c.priceTier.toUpperCase()}{c.markupPercent ? ` +${c.markupPercent}%` : ''}</p>
                  </button>
                  <button onClick={() => removeClient(c.id)}
                    className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 transition-opacity">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Project details */}
        <div className="card p-6">
          <h2 className="font-semibold text-slate-800 mb-5 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-slate-800 text-white text-xs font-bold flex items-center justify-center">1</span>
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
              <label className="label">Client Email</label>
              <input type="email" className="input" placeholder="client@example.com"
                value={meta.clientEmail} onChange={e => setMeta(m => ({ ...m, clientEmail: e.target.value }))} />
            </div>
            <div>
              <label className="label">Client Phone</label>
              <input type="tel" className="input" placeholder="+91 98765 43210"
                value={meta.clientPhone} onChange={e => setMeta(m => ({ ...m, clientPhone: e.target.value }))} />
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

        {/* Pricing */}
        <div className="card p-6">
          <h2 className="font-semibold text-slate-800 mb-5 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-slate-800 text-white text-xs font-bold flex items-center justify-center">2</span>
            Pricing
          </h2>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {TIER_OPTIONS.map(t => (
              <button
                key={t.value} type="button"
                onClick={() => setMeta(m => ({ ...m, priceTier: t.value }))}
                className={`p-3 rounded-xl border text-left transition-all ${
                  meta.priceTier === t.value
                    ? 'border-slate-700 bg-slate-800'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className={`font-semibold text-sm ${meta.priceTier === t.value ? 'text-white' : 'text-slate-800'}`}>
                  {t.label}
                </div>
                <div className={`text-xs mt-0.5 ${meta.priceTier === t.value ? 'text-slate-300' : 'text-slate-500'}`}>{t.desc}</div>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="label">Additional Markup (%)</label>
              <input type="number" min="0" max="200" className="input"
                value={meta.markupPercent}
                onChange={e => setMeta(m => ({ ...m, markupPercent: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div>
              <label className="label">Installation Rate (₹/sqft)</label>
              <input type="number" min="0" className="input"
                value={meta.installationRatePerSqft}
                onChange={e => setMeta(m => ({ ...m, installationRatePerSqft: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div>
              <label className="label">Transport Cost (₹ flat)</label>
              <input type="number" min="0" className="input"
                value={meta.transportCost}
                onChange={e => setMeta(m => ({ ...m, transportCost: parseFloat(e.target.value) || 0 }))} />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <div
                onClick={() => setMeta(m => ({ ...m, includeGst: !m.includeGst }))}
                className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${
                  meta.includeGst ? 'bg-slate-800' : 'bg-slate-200'
                }`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  meta.includeGst ? 'translate-x-5' : 'translate-x-1'
                }`} />
              </div>
              <span className="text-sm text-slate-700 font-medium">Include GST (18%)</span>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">Display:</span>
              {(['total', 'per-sqft'] as QuoteDisplayMode[]).map(m => (
                <button key={m} type="button"
                  onClick={() => setMeta(mm => ({ ...mm, displayMode: m }))}
                  className={`px-3 py-1 rounded-lg border text-xs font-semibold transition-all ${
                    meta.displayMode === m
                      ? 'border-slate-700 bg-slate-800 text-white'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {m === 'total' ? 'Total Price' : 'Per Sqft'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Ceiling items */}
        <div>
          <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-slate-800 text-white text-xs font-bold flex items-center justify-center">3</span>
            Ceiling Items
          </h2>
          <div className="space-y-4">
            {items.map((item, idx) => (
              <CeilingItemForm
                key={item.id}
                item={item}
                index={idx}
                priceTier={meta.priceTier}
                installRatePerSqft={meta.installationRatePerSqft}
                onChange={updated => updateItem(idx, updated)}
                onRemove={() => removeItem(idx)}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={addItem}
            className="mt-4 w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-500 text-sm font-medium hover:border-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
          >
            <Plus size={16} /> Add Ceiling Item
          </button>
        </div>

        {/* Notes */}
        <div className="card p-6">
          <label className="label">Quote Notes / Terms</label>
          <textarea className="input resize-none h-24"
            placeholder="Any special notes, terms, or conditions…"
            value={meta.notes}
            onChange={e => setMeta(m => ({ ...m, notes: e.target.value }))} />
        </div>
      </div>

      {/* Sidebar */}
      <div className="lg:col-span-1">
        <div className="sticky top-24 space-y-4">
          <div className="card p-5">
            <h3 className="font-semibold text-slate-800 mb-4">Quote Summary</h3>
            {preview ? (
              <>
                <div className="space-y-2 mb-4">
                  {preview.itemBreakdowns.map((bd, idx) => (
                    <div key={bd.item.id} className="flex justify-between items-center text-sm py-1.5 border-b border-slate-100 last:border-0">
                      <span className="text-slate-600 truncate max-w-[60%]">
                        {bd.item.name || `Item ${idx + 1}`}
                      </span>
                      <span className="font-semibold text-slate-800">{fmtINR(bd.itemTotal)}</span>
                    </div>
                  ))}
                </div>
                {meta.transportCost > 0 && (
                  <div className="flex justify-between text-sm py-1 text-slate-500">
                    <span>Transport</span>
                    <span>{fmtINR(meta.transportCost)}</span>
                  </div>
                )}
                {preview.gstAmount > 0 && (
                  <div className="flex justify-between text-sm py-1 text-slate-500">
                    <span>GST 18%</span>
                    <span>{fmtINR(preview.gstAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-3 border-t border-slate-200 mt-2">
                  <span className="font-bold text-slate-900">Total</span>
                  <span className="text-xl font-bold text-slate-900">{fmtINR(preview.grandTotal)}</span>
                </div>
                {meta.displayMode === 'per-sqft' && preview.totalSqft > 0 && (
                  <p className="text-xs text-slate-500 mt-1 text-right">
                    {preview.totalSqft.toFixed(1)} sqft · ₹{Math.round(preview.pricePerSqft)}/sqft
                  </p>
                )}
                <p className="text-xs text-slate-400 mt-2">
                  {meta.markupPercent > 0 ? `+${meta.markupPercent}% markup · ` : ''}
                  {meta.includeGst ? 'Incl. GST 18%' : 'Excl. GST'}
                </p>
              </>
            ) : (
              <p className="text-sm text-slate-400">Add items to see summary</p>
            )}
          </div>

          <button
            onClick={handleSave}
            disabled={saving || saved}
            className={`w-full btn text-sm py-3 font-semibold justify-center ${
              saved ? 'bg-emerald-500 text-white' : 'btn-primary'
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

          <div className="card p-4 bg-slate-50 border-slate-200">
            <p className="text-xs font-semibold text-slate-700 mb-2">Smart Calculations</p>
            <ul className="text-xs text-slate-500 space-y-1">
              <li>• Fabric cut length and gripper perimeter use exact dimensions (no rounding)</li>
              <li>• Joint option available for all rectangle sizes</li>
              <li>• LED strips counted across shorter dim at chosen gap (default 125mm), length rounded up to nearest 1m module</li>
              <li>• Circle: LED count = 80% of equivalent bounding square</li>
              <li>• DALI Tunable: DT8 150W max 10 modules + DA4m at 1 per 3 drivers</li>
              <li>• Standard Tunable/Dimmable: 200W/450W/600W drivers + EV2 + V2 + RT2</li>
              <li>• Single Colour: 80% driver capacity + EV1 + V1 + RT1</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
