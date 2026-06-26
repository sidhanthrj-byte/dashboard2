'use client'

import { Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import type { CeilingItem, ShapeType, LightType, GripperType, LEDWidth, UnitSystem } from '@/lib/types'
import { FABRIC } from '@/lib/pricing'

const FABRIC_OPTIONS = Object.keys(FABRIC)

const LIGHT_OPTIONS: { value: LightType; label: string; note?: string }[] = [
  { value: 'none', label: 'No Lighting' },
  { value: 'single_color', label: 'Single Colour', note: 'Fixed white, non-dimmable' },
  { value: 'single_color_dimmable', label: 'Single Colour Dimmable', note: 'DALI 2 driver + controller' },
  { value: 'tunable', label: 'Tunable White (CCT)', note: 'Variable warm↔cool, DT8 driver' },
  { value: 'rgb', label: 'RGB', note: 'Color changing' },
  { value: 'rgbw', label: 'RGBW / NW / WW', note: 'RGB + white' },
]

const GRIPPER_OPTIONS: GripperType[] = ['CW', 'CC', 'Profile', 'Flexible CW', 'Flexible CC']

export function defaultItem(id: string): CeilingItem {
  return {
    id,
    name: '',
    shape: 'rectangle',
    unit: 'feet',
    dimensions: { length: 0, width: 0 },
    fabricType: 'Descor Premium',
    withPrinting: false,
    withFleece: false,
    lightType: 'none',
    lightDepth: 6,
    ledWidth: 'standard',
    gripperType: 'CW',
    quantity: 1,
    notes: '',
  }
}

interface Props {
  item: CeilingItem
  index: number
  onChange: (item: CeilingItem) => void
  onRemove: () => void
}

export default function CeilingItemForm({ item, index, onChange, onRemove }: Props) {
  const [open, setOpen] = useState(true)

  function set<K extends keyof CeilingItem>(key: K, value: CeilingItem[K]) {
    onChange({ ...item, [key]: value })
  }

  function setDim(key: string, value: number) {
    onChange({ ...item, dimensions: { ...item.dimensions, [key]: value } })
  }

  function setShape(shape: ShapeType) {
    const dims: Record<ShapeType, object> = {
      rectangle: { length: 0, width: 0 },
      circle:    { diameter: 0 },
      triangle:  { base: 0, height: 0, side1: 0, side2: 0, side3: 0 },
      'l-shape': { length1: 0, width1: 0, length2: 0, width2: 0 },
    }
    onChange({ ...item, shape, dimensions: dims[shape] as CeilingItem['dimensions'] })
  }

  const d = item.dimensions as unknown as Record<string, number>
  const u = item.unit === 'feet' ? 'ft' : 'm'
  const hasLights = item.lightType !== 'none'

  return (
    <div className="card overflow-hidden">
      {/* Item header */}
      <div
        className="flex items-center justify-between px-5 py-3.5 cursor-pointer bg-slate-50 border-b border-slate-100 hover:bg-slate-100 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-3">
          <span className="w-6 h-6 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center shrink-0">
            {index + 1}
          </span>
          <div>
            <span className="font-semibold text-slate-800 text-sm">
              {item.name || `Ceiling Item ${index + 1}`}
            </span>
            {!open && item.shape === 'rectangle' && (d.length > 0 || d.width > 0) && (
              <span className="text-xs text-slate-500 ml-2">
                {d.length} × {d.width} {u} · {item.fabricType}
                {hasLights ? ` · ${LIGHT_OPTIONS.find(l => l.value === item.lightType)?.label}` : ''}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          <button onClick={onRemove} className="btn-danger px-2 py-1 text-xs" title="Remove item">
            <Trash2 size={13} />
          </button>
          <button className="btn-ghost px-2 py-1" onClick={() => setOpen(o => !o)}>
            {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="px-5 py-5 space-y-6">
          {/* Row 1: Name + Quantity */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="label">Item Name / Location</label>
              <input
                className="input"
                placeholder="e.g. Master Bedroom, Living Room"
                value={item.name}
                onChange={e => set('name', e.target.value)}
              />
            </div>
            <div>
              <label className="label">Quantity</label>
              <input
                type="number" min={1} className="input"
                value={item.quantity}
                onChange={e => set('quantity', Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>
          </div>

          {/* Row 2: Shape + Unit */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Shape</label>
              <select className="select" value={item.shape} onChange={e => setShape(e.target.value as ShapeType)}>
                <option value="rectangle">Rectangle / Square</option>
                <option value="circle">Circle</option>
                <option value="triangle">Triangle</option>
                <option value="l-shape">L-Shape</option>
              </select>
            </div>
            <div>
              <label className="label">Unit</label>
              <select className="select" value={item.unit} onChange={e => set('unit', e.target.value as UnitSystem)}>
                <option value="feet">Feet</option>
                <option value="meters">Meters</option>
              </select>
            </div>
          </div>

          {/* Row 3: Dimensions */}
          <div>
            <label className="label">Dimensions ({u})</label>
            {item.shape === 'rectangle' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-xs text-slate-500 mb-1 block">Length</span>
                  <input type="number" step="0.1" min="0" className="input"
                    value={d.length || ''} onChange={e => setDim('length', parseFloat(e.target.value) || 0)} />
                </div>
                <div>
                  <span className="text-xs text-slate-500 mb-1 block">Width</span>
                  <input type="number" step="0.1" min="0" className="input"
                    value={d.width || ''} onChange={e => setDim('width', parseFloat(e.target.value) || 0)} />
                </div>
              </div>
            )}
            {item.shape === 'circle' && (
              <div className="max-w-xs">
                <span className="text-xs text-slate-500 mb-1 block">Diameter — quoted as bounding square (⌀ × ⌀)</span>
                <input type="number" step="0.1" min="0" className="input"
                  value={d.diameter || ''} onChange={e => setDim('diameter', parseFloat(e.target.value) || 0)} />
              </div>
            )}
            {item.shape === 'triangle' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-xs text-slate-500 mb-1 block">Base</span>
                    <input type="number" step="0.1" min="0" className="input"
                      value={d.base || ''} onChange={e => setDim('base', parseFloat(e.target.value) || 0)} />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 mb-1 block">Height (perpendicular)</span>
                    <input type="number" step="0.1" min="0" className="input"
                      value={d.height || ''} onChange={e => setDim('height', parseFloat(e.target.value) || 0)} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {['side1','side2','side3'].map((s, i) => (
                    <div key={s}>
                      <span className="text-xs text-slate-500 mb-1 block">Side {i+1} (for perimeter)</span>
                      <input type="number" step="0.1" min="0" className="input"
                        value={d[s] || ''} onChange={e => setDim(s, parseFloat(e.target.value) || 0)} />
                    </div>
                  ))}
                </div>
              </div>
            )}
            {item.shape === 'l-shape' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-500">Enter dimensions of the two rectangular sections that form the L.</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-xs text-slate-500 mb-1 block">Section A — Length</span>
                    <input type="number" step="0.1" min="0" className="input"
                      value={d.length1 || ''} onChange={e => setDim('length1', parseFloat(e.target.value) || 0)} />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 mb-1 block">Section A — Width</span>
                    <input type="number" step="0.1" min="0" className="input"
                      value={d.width1 || ''} onChange={e => setDim('width1', parseFloat(e.target.value) || 0)} />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 mb-1 block">Section B — Length</span>
                    <input type="number" step="0.1" min="0" className="input"
                      value={d.length2 || ''} onChange={e => setDim('length2', parseFloat(e.target.value) || 0)} />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 mb-1 block">Section B — Width</span>
                    <input type="number" step="0.1" min="0" className="input"
                      value={d.width2 || ''} onChange={e => setDim('width2', parseFloat(e.target.value) || 0)} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Row 4: Fabric */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Fabric Type</label>
              <select className="select" value={item.fabricType} onChange={e => set('fabricType', e.target.value)}>
                {FABRIC_OPTIONS.map(f => <option key={f}>{f}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-2 pt-5">
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input type="checkbox" className="rounded border-slate-300 text-amber-500 focus:ring-amber-400"
                  checked={item.withPrinting}
                  onChange={e => set('withPrinting', e.target.checked)} />
                Add Printing Charges
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input type="checkbox" className="rounded border-slate-300 text-amber-500 focus:ring-amber-400"
                  checked={item.withFleece}
                  onChange={e => set('withFleece', e.target.checked)} />
                Add Felt Pad / Fleece
              </label>
            </div>
          </div>

          {/* Row 5: Gripper */}
          <div className="max-w-xs">
            <label className="label">Gripper Type</label>
            <select className="select" value={item.gripperType}
              onChange={e => set('gripperType', e.target.value as GripperType)}>
              {GRIPPER_OPTIONS.map(g => (
                <option key={g} value={g}>{g} Gripper</option>
              ))}
            </select>
          </div>

          {/* Row 6: Lighting */}
          <div>
            <label className="label">Lighting</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {LIGHT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => set('lightType', opt.value)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    item.lightType === opt.value
                      ? 'border-amber-400 bg-amber-50 text-amber-800'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="text-sm font-medium">{opt.label}</div>
                  {opt.note && <div className="text-xs text-slate-400 mt-0.5">{opt.note}</div>}
                </button>
              ))}
            </div>
          </div>

          {/* Light sub-options */}
          {hasLights && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-amber-50 rounded-lg border border-amber-100">
              <div>
                <label className="label">Cove Depth (inches)</label>
                <input
                  type="number" step="1" min="6" className="input"
                  value={item.lightDepth}
                  onChange={e => set('lightDepth', Math.max(6, parseInt(e.target.value) || 6))}
                />
                <p className="text-xs text-amber-700 mt-1">
                  1 strip per 6 inches · {Math.max(1, Math.floor((item.lightDepth ?? 6) / 6))} strip{Math.max(1, Math.floor((item.lightDepth ?? 6) / 6)) !== 1 ? 's' : ''}
                </p>
              </div>
              <div>
                <label className="label">LED Module Width</label>
                <div className="flex gap-2">
                  {(['standard', 'wider'] as LEDWidth[]).map(w => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => set('ledWidth', w)}
                      className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${
                        item.ledWidth === w
                          ? 'border-amber-400 bg-amber-100 text-amber-800'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {w.charAt(0).toUpperCase() + w.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="label">Notes (optional)</label>
            <textarea
              className="input resize-none h-16"
              placeholder="Any special requirements for this ceiling…"
              value={item.notes}
              onChange={e => set('notes', e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
