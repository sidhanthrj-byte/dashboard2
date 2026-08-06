'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Save, Loader2, BookUser, Trash2, ChevronUp } from 'lucide-react'
import { v4 as uuid } from 'uuid'
import { useRouter } from 'next/navigation'
import CeilingItemForm, { defaultItem } from './CeilingItemForm'
import type { Quote, CeilingItem, PriceTier, QuoteDisplayMode, ManualRates, CustomLine } from '@/lib/types'
import { calculateQuote, fmtINR } from '@/lib/calculations'
import { listClients, saveClient, deleteClient, type SavedClient } from '@/lib/clients'
import { listCompanies, DEFAULT_COMPANY } from '@/lib/companies'

interface Props {
  initial?: Quote
  mode: 'new' | 'edit'
}

export default function QuoteBuilder({ initial, mode }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [savingInternal, setSavingInternal] = useState(false)

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
    company: initial?.company ?? DEFAULT_COMPANY,
  })

  const [manualRates, setManualRates] = useState<ManualRates>(
    initial?.manualRates ?? { fabricPerSqm: 0, ledPerMtr: 0, gripperPerRmt: 0, otherItemsTier: 'msp' }
  )

  const [items, setItems] = useState<CeilingItem[]>(
    initial?.items?.length ? initial.items : [defaultItem(uuid())]
  )

  // Feature 4 — free-form rows for the Manual (Custom) tab.
  const [customLines, setCustomLines] = useState<CustomLine[]>(
    initial?.customLines?.length ? initial.customLines : [{ id: uuid(), description: '', qty: 1, cost: 0, sellingPrice: 0 }]
  )
  const isCustom = meta.priceTier === 'manual_custom'

  const [preview, setPreview] = useState<ReturnType<typeof calculateQuote> | null>(null)
  const [clients, setClients] = useState<SavedClient[]>([])
  const [showClientBook, setShowClientBook] = useState(false)
  const [showBreak, setShowBreak] = useState(false)

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
        manualRates: meta.priceTier === 'manual' ? manualRates : undefined,
        customLines: meta.priceTier === 'manual_custom' ? customLines : undefined,
      }
      setPreview(calculateQuote(fakeQuote))
    } catch {
      setPreview(null)
    }
  }, [meta, items, manualRates, customLines])

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

  async function saveQuote(redirectTo: 'team' | 'internal' = 'team') {
    if (!meta.clientName.trim()) { alert('Please enter a client name.'); return }
    if (isCustom) {
      if (!customLines.some(l => l.description.trim())) { alert('Please add at least one custom line.'); return }
    } else if (items.length === 0) { alert('Please add at least one ceiling item.'); return }

    const isInternal = redirectTo === 'internal'
    if (isInternal) setSavingInternal(true)
    else setSaving(true)

    try {
      const payload = {
        ...meta, items,
        manualRates: meta.priceTier === 'manual' ? manualRates : undefined,
        customLines: isCustom ? customLines : undefined,
      }
      const url = mode === 'edit' ? `/api/quotes/${initial!.id}` : '/api/quotes'
      const method = mode === 'edit' ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) {
        const err = await res.text()
        alert(`Save failed (${res.status}): ${err}`)
        setSaving(false); setSavingInternal(false)
        return
      }
      const savedQ = await res.json()
      if (!savedQ?.id) {
        alert('Save failed: unexpected server response')
        setSaving(false); setSavingInternal(false)
        return
      }
      if (isInternal) {
        setSavingInternal(false)
        router.push(`/quotes/${savedQ.id}/internal`)
      } else {
        setSaving(false)
        router.push(`/quotes/${savedQ.id}/team`)
      }
    } catch (e) {
      alert(`Save error: ${e}`)
      setSaving(false); setSavingInternal(false)
    }
  }

  function handleSave() { return saveQuote('team') }

  const TIER_OPTIONS: { value: PriceTier; label: string; desc: string }[] = [
    { value: 'dealer', label: 'Dealer', desc: 'Dealer pricing' },
    { value: 'msp', label: 'MSP', desc: 'Market selling price' },
    { value: 'specifiors', label: 'Specifiors', desc: 'Architects / Specifiers' },
    { value: 'manual', label: 'Manual', desc: 'Set custom rates' },
    { value: 'manual_custom', label: 'Manual (Custom)', desc: 'Free-form rows' },
  ]

  // Options for the custom-line item dropdown (selectable but free-text via datalist).
  const CUSTOM_ITEM_SUGGESTIONS = [
    'Stretch Ceiling Fabric', 'Printed Fabric', 'Acoustic Fabric', 'Translucent Fabric',
    'LED Strip', 'LED Driver', 'DALI Controller', 'Gripper Track', 'Profile',
    'Installation', 'Transport', 'Fabrication', 'Site Survey', 'Miscellaneous',
  ]

  function updateCustomLine(id: string, patch: Partial<CustomLine>) {
    setCustomLines(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l))
  }
  function addCustomLine() {
    setCustomLines(prev => [...prev, { id: uuid(), description: '', qty: 1, cost: 0, sellingPrice: 0 }])
  }
  function removeCustomLine(id: string) {
    setCustomLines(prev => prev.filter(l => l.id !== id))
  }
  const customTotal = customLines.reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.sellingPrice) || 0), 0)

  const SectionHead = ({ n, title, note, right }: { n: string; title: string; note?: string; right?: React.ReactNode }) => (
    <div className="flex items-end justify-between mb-4">
      <div className="flex items-baseline gap-3">
        <span className="fig text-[12px] font-medium" style={{ color: 'var(--accent)' }}>{n}</span>
        <h2 className="font-display text-[17px] font-semibold" style={{ color: 'var(--ink)' }}>{title}</h2>
        {note && <span className="text-[12px]" style={{ color: 'var(--faint)' }}>{note}</span>}
      </div>
      {right}
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto pb-28">

      {/* Client book */}
      <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid var(--rule)' }}>
        <button onClick={() => setShowClientBook(v => !v)}
          className="flex items-center gap-2 text-[13px] font-medium transition-colors" style={{ color: 'var(--ink-2)' }}>
          <BookUser size={15} />
          {showClientBook ? 'Hide client book' : 'Load from client book'}
          {clients.length > 0 && <span className="fig text-[11px]" style={{ color: 'var(--faint)' }}>({clients.length})</span>}
        </button>
        <button onClick={saveCurrentClient} className="btn-ghost btn-sm"><Save size={13} /> Save client</button>
      </div>
      {showClientBook && (
        <div className="py-3 space-y-1 max-h-52 overflow-y-auto animate-fade-in" style={{ borderBottom: '1px solid var(--rule)' }}>
          {clients.length === 0 && (
            <p className="text-[13px] italic" style={{ color: 'var(--faint)' }}>No saved clients yet — fill in details below and click “Save client”.</p>
          )}
          {clients.map(c => (
            <div key={c.id} className="flex items-center justify-between px-3 py-2 rounded-[3px] hover:bg-[color:var(--sheet-2)] group">
              <button onClick={() => loadClient(c)} className="flex-1 text-left">
                <p className="text-[13px] font-medium" style={{ color: 'var(--ink)' }}>{c.name}</p>
                <p className="fig text-[10.5px] uppercase mt-0.5" style={{ color: 'var(--faint)' }}>{c.location} · {c.priceTier.toUpperCase()}{c.markupPercent ? ` +${c.markupPercent}%` : ''}</p>
              </button>
              <button onClick={() => removeClient(c.id)} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--faint)' }}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* §01 Title block */}
      <section className="pt-9">
        <SectionHead n="01" title="Title block" note="Client & project of record" />

        <div className="mb-6">
          <label className="label">Issuing company <span style={{ color: 'var(--accent)' }}>*</span></label>
          <div className="flex gap-2 flex-wrap">
            {listCompanies().map(c => (
              <button key={c.id} type="button" onClick={() => setMeta(m => ({ ...m, company: c.id }))}
                className={`opt ${meta.company === c.id ? 'opt-on' : ''} min-w-[150px]`}>
                <span className="block text-[13px] font-semibold">{c.shortName}</span>
                <span className="block text-[11px] mt-0.5" style={{ color: 'var(--faint)' }}>{c.name}</span>
              </button>
            ))}
          </div>
          <p className="text-[12px] mt-2" style={{ color: 'var(--muted)' }}>Sets the name, address, GST and bank details printed on the PDF. Pricing and calculations are identical for both.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
          <div><label className="label">Client name <span style={{ color: 'var(--accent)' }}>*</span></label>
            <input className="input" placeholder="ABC Corporation" value={meta.clientName} onChange={e => setMeta(m => ({ ...m, clientName: e.target.value }))} /></div>
          <div><label className="label">Project name</label>
            <input className="input" placeholder="Office Renovation" value={meta.projectName} onChange={e => setMeta(m => ({ ...m, projectName: e.target.value }))} /></div>
          <div><label className="label">Client email</label>
            <input type="email" className="input" placeholder="client@example.com" value={meta.clientEmail} onChange={e => setMeta(m => ({ ...m, clientEmail: e.target.value }))} /></div>
          <div><label className="label">Client phone</label>
            <input type="tel" className="input" placeholder="+91 98765 43210" value={meta.clientPhone} onChange={e => setMeta(m => ({ ...m, clientPhone: e.target.value }))} /></div>
          <div><label className="label">Location</label>
            <input className="input" placeholder="Mumbai" value={meta.location} onChange={e => setMeta(m => ({ ...m, location: e.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-x-5">
            <div><label className="label">Issued</label>
              <input type="date" className="input fig" value={meta.date} onChange={e => setMeta(m => ({ ...m, date: e.target.value }))} /></div>
            <div><label className="label">Valid until</label>
              <input type="date" className="input fig" value={meta.validUntil} onChange={e => setMeta(m => ({ ...m, validUntil: e.target.value }))} /></div>
          </div>
        </div>
      </section>

      <div className="mt-9" style={{ borderTop: '1px solid var(--rule)' }} />

      {/* §02 Terms */}
      <section className="pt-9">
        <SectionHead n="02" title="Commercial terms" note="Pricing basis & charges" />

        <label className="label">Pricing tier</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-4">
          {TIER_OPTIONS.map(t => (
            <button key={t.value} type="button" onClick={() => setMeta(m => ({ ...m, priceTier: t.value }))}
              className={`opt ${meta.priceTier === t.value ? 'opt-on' : ''}`}>
              <div className="text-[13px] font-semibold">{t.label}</div>
              <div className="text-[11px] mt-0.5" style={{ color: 'var(--faint)' }}>{t.desc}</div>
            </button>
          ))}
        </div>

        {meta.priceTier === 'manual' && (
          <div className="p-4 rounded-[4px] mb-4 space-y-3 animate-fade-in"
            style={{ background: 'var(--sheet)', border: '1px solid var(--rule-2)', boxShadow: 'inset 3px 0 0 var(--accent)' }}>
            <p className="fig text-[10.5px] uppercase" style={{ color: 'var(--accent-ink)', letterSpacing: '0.08em' }}>Manual rates — price per unit</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div><label className="label">Fabric ₹/sqm</label>
                <input type="number" min="0" step="10" className="input fig" placeholder="1100" value={manualRates.fabricPerSqm || ''} onChange={e => setManualRates(r => ({ ...r, fabricPerSqm: parseFloat(e.target.value) || 0 }))} /></div>
              <div><label className="label">LED ₹/mtr</label>
                <input type="number" min="0" step="10" className="input fig" placeholder="350" value={manualRates.ledPerMtr || ''} onChange={e => setManualRates(r => ({ ...r, ledPerMtr: parseFloat(e.target.value) || 0 }))} /></div>
              <div><label className="label">Gripper ₹/rmt</label>
                <input type="number" min="0" step="5" className="input fig" placeholder="170" value={manualRates.gripperPerRmt || ''} onChange={e => setManualRates(r => ({ ...r, gripperPerRmt: parseFloat(e.target.value) || 0 }))} /></div>
            </div>
            <div>
              <label className="label">Drivers, controls, printing & fleece — tier</label>
              <div className="flex gap-2">
                {(['dealer', 'msp', 'specifiors'] as const).map(t => (
                  <button key={t} type="button" onClick={() => setManualRates(r => ({ ...r, otherItemsTier: t }))}
                    className={`opt ${manualRates.otherItemsTier === t ? 'opt-on' : ''} px-3 py-1.5 text-[12px] font-semibold`}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-5 gap-y-4 mb-5">
          {!isCustom && (
            <div><label className="label">Markup %</label>
              <input type="number" min="0" max="200" className="input fig" value={meta.markupPercent} onChange={e => setMeta(m => ({ ...m, markupPercent: parseFloat(e.target.value) || 0 }))} /></div>
          )}
          {!isCustom && (
            <div><label className="label">Install ₹/sqft</label>
              <input type="number" min="0" className="input fig" value={meta.installationRatePerSqft} onChange={e => setMeta(m => ({ ...m, installationRatePerSqft: parseFloat(e.target.value) || 0 }))} /></div>
          )}
          <div><label className="label">Transport ₹</label>
            <input type="number" min="0" className="input fig" value={meta.transportCost} onChange={e => setMeta(m => ({ ...m, transportCost: parseFloat(e.target.value) || 0 }))} /></div>
        </div>

        <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <div onClick={() => setMeta(m => ({ ...m, includeGst: !m.includeGst }))}
              className="w-9 h-5 rounded-full transition-colors relative cursor-pointer"
              style={{ background: meta.includeGst ? 'var(--ink)' : 'var(--rule-2)' }}>
              <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                style={{ transform: meta.includeGst ? 'translateX(18px)' : 'translateX(2px)' }} />
            </div>
            <span className="text-[13px] font-medium" style={{ color: 'var(--ink-2)' }}>Include GST (18%)</span>
          </label>
          <div className="flex items-center gap-2">
            <span className="label mb-0">Display</span>
            <div className="flex" style={{ borderBottom: '1px solid var(--rule)' }}>
              {(['total', 'per-sqft'] as QuoteDisplayMode[]).map(m => (
                <button key={m} type="button" onClick={() => setMeta(mm => ({ ...mm, displayMode: m }))}
                  className={`seg ${meta.displayMode === m ? 'seg-on' : ''}`}>{m === 'total' ? 'Total' : 'Per sqft'}</button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="mt-9" style={{ borderTop: '1px solid var(--rule)' }} />

      {/* §03 Schedule of items — free-form in Manual (Custom), ceiling schedule otherwise */}
      {isCustom ? (
        <section className="pt-9">
          <SectionHead n="03" title="Custom quotation" note="Free-form — no automatic pricing" />
          <p className="text-[12.5px] mb-4" style={{ color: 'var(--muted)' }}>
            Build the quotation by hand. Every value below is used exactly as entered — no calculations,
            dependencies or automatic pricing are applied.
          </p>

          {/* Column headers (desktop) */}
          <div className="hidden sm:grid gap-2 px-1 pb-2 mb-1" style={{ gridTemplateColumns: '1fr 80px 110px 110px 110px 32px', borderBottom: '1px solid var(--rule-2)' }}>
            <div className="label mb-0">Item</div>
            <div className="label mb-0 text-right">Qty</div>
            <div className="label mb-0 text-right">Cost ₹</div>
            <div className="label mb-0 text-right">Selling ₹</div>
            <div className="label mb-0 text-right">Amount</div>
            <div />
          </div>

          <datalist id="custom-item-suggestions">
            {CUSTOM_ITEM_SUGGESTIONS.map(s => <option key={s} value={s} />)}
          </datalist>

          <div className="space-y-2">
            {customLines.map((l) => {
              const amount = (Number(l.qty) || 0) * (Number(l.sellingPrice) || 0)
              return (
                <div key={l.id} className="grid gap-2 items-center" style={{ gridTemplateColumns: '1fr 80px 110px 110px 110px 32px' }}>
                  <input list="custom-item-suggestions" className="input" placeholder="Select or type item"
                    value={l.description} onChange={e => updateCustomLine(l.id, { description: e.target.value })} />
                  <input type="number" min="0" step="1" className="input fig text-right" placeholder="1"
                    value={l.qty || ''} onChange={e => updateCustomLine(l.id, { qty: parseFloat(e.target.value) || 0 })} />
                  <input type="number" min="0" step="1" className="input fig text-right" placeholder="0"
                    value={l.cost || ''} onChange={e => updateCustomLine(l.id, { cost: parseFloat(e.target.value) || 0 })} />
                  <input type="number" min="0" step="1" className="input fig text-right" placeholder="0"
                    value={l.sellingPrice || ''} onChange={e => updateCustomLine(l.id, { sellingPrice: parseFloat(e.target.value) || 0 })} />
                  <div className="fig text-[13px] text-right" style={{ color: 'var(--ink)' }}>{fmtINR(amount)}</div>
                  <button type="button" onClick={() => removeCustomLine(l.id)} className="btn-ghost btn-sm px-1.5" title="Remove row"
                    disabled={customLines.length === 1} style={{ color: 'var(--accent)' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              )
            })}
          </div>
          <button type="button" onClick={addCustomLine}
            className="mt-4 w-full py-3 rounded-[4px] text-[13px] font-medium flex items-center justify-center gap-2 transition-colors"
            style={{ border: '1px dashed var(--rule-2)', color: 'var(--muted)' }}>
            <Plus size={15} /> Add row
          </button>
          <div className="flex justify-end mt-3">
            <div className="fig text-[13px]" style={{ color: 'var(--muted)' }}>
              Lines total: <span style={{ color: 'var(--ink)' }}>{fmtINR(customTotal)}</span>
            </div>
          </div>
        </section>
      ) : (
        <section className="pt-9">
          <SectionHead n="03" title="Schedule of items" note={`${items.length} ceiling${items.length !== 1 ? 's' : ''}`} />
          <div className="space-y-4">
            {items.map((item, idx) => (
              <CeilingItemForm key={item.id} item={item} index={idx}
                priceTier={meta.priceTier} installRatePerSqft={meta.installationRatePerSqft}
                manualRates={meta.priceTier === 'manual' ? manualRates : undefined}
                onChange={updated => updateItem(idx, updated)} onRemove={() => removeItem(idx)} />
            ))}
          </div>
          <button type="button" onClick={addItem}
            className="mt-4 w-full py-3 rounded-[4px] text-[13px] font-medium flex items-center justify-center gap-2 transition-colors"
            style={{ border: '1px dashed var(--rule-2)', color: 'var(--muted)' }}>
            <Plus size={15} /> Add ceiling item
          </button>
        </section>
      )}

      <div className="mt-9" style={{ borderTop: '1px solid var(--rule)' }} />

      {/* Notes */}
      <section className="pt-9">
        <label className="label">Notes / terms</label>
        <textarea className="input resize-none h-24" placeholder="Any special notes, terms, or conditions…"
          value={meta.notes} onChange={e => setMeta(m => ({ ...m, notes: e.target.value }))} />

        <details className="mt-6 group">
          <summary className="fig text-[10.5px] uppercase cursor-pointer list-none flex items-center gap-2"
            style={{ color: 'var(--faint)', letterSpacing: '0.1em' }}>
            <span>Calculation basis</span>
            <span style={{ color: 'var(--rule-2)' }}>▸</span>
          </summary>
          <ul className="text-[12px] space-y-1 mt-3" style={{ color: 'var(--muted)' }}>
            <li>· Fabric cut length and gripper perimeter use exact dimensions (no rounding)</li>
            <li>· Joint option available for all rectangle sizes</li>
            <li>· LED strips counted across shorter dim at chosen gap (default 125 mm), length rounded up to nearest 1 m module</li>
            <li>· Circle: LED count = 80% of equivalent bounding square</li>
            <li>· DALI tunable: DT8 150 W max 10 modules + DA4m at 1 per 3 drivers</li>
            <li>· Standard tunable/dimmable: 200/450/600 W drivers + EV2 + V2 + RT2</li>
            <li>· Single colour: 80% driver capacity + EV1 + V1 + RT1</li>
            <li>· Single colour dimmable (without DALI): std drivers · repeaters = drivers · 1 controller per 3 · 1 remote</li>
            <li>· RGB uses DA4M controller · RGBW uses DA5M controller</li>
            <li>· Item looping: items in the same loop group share one driver set (combined wattage)</li>
          </ul>
        </details>
      </section>

      {/* Persistent title-block bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40"
        style={{ background: 'rgba(244,240,231,0.92)', backdropFilter: 'blur(10px)', borderTop: '1px solid var(--rule-2)' }}>
        {/* Breakdown popover */}
        {showBreak && preview && (
          <div className="max-w-3xl mx-auto px-4 sm:px-0">
            <div className="mb-0 animate-rise rounded-t-[4px] px-4 py-3"
              style={{ background: 'var(--sheet)', borderTop: '1px solid var(--rule-2)', borderLeft: '1px solid var(--rule-2)', borderRight: '1px solid var(--rule-2)', maxHeight: 260, overflowY: 'auto' }}>
              {preview.itemBreakdowns.map((bd, idx) => (
                <div key={bd.item.id} className="flex justify-between items-center text-[13px] py-1.5" style={{ borderBottom: '1px solid var(--rule)' }}>
                  <span className="truncate max-w-[60%]" style={{ color: 'var(--ink-2)' }}>{bd.item.name || `Item ${idx + 1}`}</span>
                  <span className="fig font-medium" style={{ color: 'var(--ink)' }}>{fmtINR(bd.itemTotal)}</span>
                </div>
              ))}
              {meta.transportCost > 0 && (
                <div className="flex justify-between text-[13px] py-1.5" style={{ color: 'var(--muted)' }}><span>Transport</span><span className="fig">{fmtINR(meta.transportCost)}</span></div>
              )}
              {preview.gstAmount > 0 && (
                <div className="flex justify-between text-[13px] py-1.5" style={{ color: 'var(--muted)' }}><span>GST 18%</span><span className="fig">{fmtINR(preview.gstAmount)}</span></div>
              )}
            </div>
          </div>
        )}

        <div className="max-w-3xl mx-auto px-4 sm:px-0 py-3 flex items-center gap-4">
          {/* Running total */}
          <button onClick={() => setShowBreak(v => !v)} disabled={!preview}
            className="flex items-center gap-3 text-left disabled:opacity-50">
            <div>
              <div className="fig text-[9.5px] uppercase flex items-center gap-1" style={{ color: 'var(--faint)', letterSpacing: '0.12em' }}>
                Total
                {preview && <ChevronUp size={11} className="transition-transform" style={{ transform: showBreak ? 'none' : 'rotate(180deg)', color: 'var(--rule-2)' }} />}
              </div>
              <div className="fig text-[22px] font-semibold leading-none mt-0.5" style={{ color: 'var(--ink)' }}>
                {preview ? fmtINR(preview.grandTotal) : '—'}
              </div>
            </div>
          </button>

          <div className="hidden sm:block fig text-[10.5px] leading-relaxed" style={{ color: 'var(--faint)' }}>
            {meta.markupPercent > 0 ? `+${meta.markupPercent}% markup · ` : ''}{meta.includeGst ? 'incl. GST' : 'excl. GST'}
            {meta.displayMode === 'per-sqft' && preview && preview.totalSqft > 0 && (
              <><br />{preview.totalSqft.toFixed(1)} sqft · ₹{Math.round(preview.pricePerSqft)}/sqft</>
            )}
          </div>

          <div className="flex-1" />

          <button onClick={() => saveQuote('internal')} disabled={savingInternal || saving} className="btn-secondary hidden sm:inline-flex">
            {savingInternal ? <><Loader2 size={15} className="animate-spin" /> Saving…</> : 'Internal review'}
          </button>
          {mode === 'edit' && <a href="/" className="btn-ghost hidden sm:inline-flex">Cancel</a>}
          <button onClick={handleSave} disabled={saving} className="btn-primary btn-lg">
            {saving ? <><Loader2 size={15} className="animate-spin" /> Saving…</> : <><Save size={15} /> {mode === 'edit' ? 'Update quote' : 'Save quote'}</>}
          </button>
        </div>
      </div>
    </div>
  )
}
