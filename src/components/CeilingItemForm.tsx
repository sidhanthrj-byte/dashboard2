'use client'

import { Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { useState, useMemo } from 'react'
import type { CeilingItem, ShapeType, LightType, GripperType, LEDWidth, UnitSystem, SurfaceType, JointType } from '@/lib/types'
import { FABRIC } from '@/lib/pricing'
import { calculateItem, fmtINR, round2 } from '@/lib/calculations'

const FABRIC_OPTIONS = Object.keys(FABRIC)

const LIGHT_OPTIONS: { value: LightType; label: string; note?: string }[] = [
  { value: 'none', label: 'No Lighting' },
  { value: 'single_color', label: 'Single Colour', note: 'Fixed white, non-dimmable' },
  { value: 'single_color_dimmable', label: 'Single Colour Dimmable', note: 'DALI 2 driver' },
  { value: 'tunable', label: 'Tunable White', note: 'Variable warm↔cool' },
  { value: 'tunable_dali', label: 'Tunable (DALI at site)', note: 'DT8 + DA4m on-site' },
  { value: 'rgb', label: 'RGB', note: 'Color changing' },
  { value: 'rgbw', label: 'RGBW / NW / WW', note: 'RGB + white' },
]

const GRIPPER_OPTIONS: GripperType[] = ['CW', 'CC', 'Profile', 'Flexible CW', 'Flexible CC']
const DEPTH_OPTIONS = [4, 5, 6, 7, 8, 9, 10, 12]

export function defaultItem(id: string): CeilingItem {
  return {
    id,
    name: '',
    surface: 'ceiling',
    shape: 'rectangle',
    unit: 'mm',
    dimensions: { dim1: 0, dim2: 0 },
    fabricType: 'Descor Premium',
    withPrinting: false,
    withFleece: false,
    lightType: 'none',
    lightDepth: 6,
    ledWidth: 'standard',
    gripperType: 'CW',
    quantity: 1,
    jointType: 'none',
    jointPosition: 0,
    notes: '',
  }
}

interface Props {
  item: CeilingItem
  index: number
  priceTier: import('@/lib/types').PriceTier
  onChange: (item: CeilingItem) => void
  onRemove: () => void
}

export default function CeilingItemForm({ item, index, priceTier, onChange, onRemove }: Props) {
  const [open, setOpen] = useState(true)

  function set<K extends keyof CeilingItem>(key: K, value: CeilingItem[K]) {
    onChange({ ...item, [key]: value })
  }

  function setDim(key: string, value: number) {
    onChange({ ...item, dimensions: { ...item.dimensions, [key]: value } })
  }

  function setShape(shape: ShapeType) {
    const dims: Record<ShapeType, object> = {
      rectangle: { dim1: 0, dim2: 0 },
      circle:    { diameter: 0 },
      triangle:  { dim1: 0, dim2: 0, side1: 0, side2: 0, side3: 0 },
      'l-shape': { length1: 0, width1: 0, length2: 0, width2: 0 },
    }
    onChange({ ...item, shape, dimensions: dims[shape] as CeilingItem['dimensions'] })
  }

  const d = item.dimensions as unknown as Record<string, number>
  const hasLights = item.lightType !== 'none'

  // Compute whether both dims exceed 5000mm
  const dim1MM = item.unit === 'mm' ? (d.dim1 ?? 0) : item.unit === 'feet' ? (d.dim1 ?? 0) * 304.8 : (d.dim1 ?? 0) * 1000
  const dim2MM = item.unit === 'mm' ? (d.dim2 ?? 0) : item.unit === 'feet' ? (d.dim2 ?? 0) * 304.8 : (d.dim2 ?? 0) * 1000
  const bothOver5k = item.shape === 'rectangle' && dim1MM > 5000 && dim2MM > 5000

  // Live calc preview
  const preview = useMemo(() => {
    try {
      return calculateItem(item, priceTier)
    } catch {
      return null
    }
  }, [item, priceTier])

  const stripCount = hasLights ? Math.max(1, Math.floor((item.lightDepth ?? 6) / 6)) : 0

  return (
    <div className="card overflow-hidden">
      {/* Item header */}
      <div
        className="flex items-center justify-between px-5 py-3.5 cursor-pointer bg-slate-50 border-b border-slate-100 hover:bg-slate-100 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-3">
          <span className="w-6 h-6 rounded-full bg-slate-800 text-white text-xs font-bold flex items-center justify-center shrink-0">
            {index + 1}
          </span>
          <div>
            <span className="font-semibold text-slate-800 text-sm">
              {item.name || `Ceiling Item ${index + 1}`}
            </span>
            {!open && (d.dim1 > 0 || d.dim2 > 0) && (
              <span className="text-xs text-slate-500 ml-2">
                {d.dim1} × {d.dim2} {item.unit} · {item.fabricType}
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
        <div className="px-5 py-5 space-y-5">
          {/* Row 1: Name + Surface + Quantity */}
          <div className="grid grid-cols-4 gap-4">
            <div className="col-span-2">
              <label className="label">Item Name / Location</label>
              <input
                className="input"
                placeholder="e.g. Master Bedroom"
                value={item.name}
                onChange={e => set('name', e.target.value)}
              />
            </div>
            <div>
              <label className="label">Surface</label>
              <div className="flex gap-2">
                {(['ceiling', 'wall'] as SurfaceType[]).map(s => (
                  <button
                    key={s} type="button"
                    onClick={() => onChange({ ...item, surface: s, gripperType: s === 'ceiling' ? 'CW' : 'CC' })}
                    className={`flex-1 py-2 rounded-lg border text-xs font-semibold transition-all ${
                      item.surface === s
                        ? 'border-slate-700 bg-slate-800 text-white'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
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

          {/* Row 2: Shape */}
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
          </div>

          {/* Row 3: Dimensions — unified dim1 x dim2 + unit dropdown */}
          <div>
            <label className="label">Dimensions</label>
            {item.shape === 'rectangle' && (
              <div className="flex items-center gap-2">
                <input
                  type="number" step="1" min="0" className="input max-w-[160px]"
                  placeholder="Dim 1"
                  value={d.dim1 || ''}
                  onChange={e => setDim('dim1', parseFloat(e.target.value) || 0)}
                />
                <span className="text-slate-400 font-bold text-lg">×</span>
                <input
                  type="number" step="1" min="0" className="input max-w-[160px]"
                  placeholder="Dim 2"
                  value={d.dim2 || ''}
                  onChange={e => setDim('dim2', parseFloat(e.target.value) || 0)}
                />
                <select
                  className="select max-w-[100px]"
                  value={item.unit}
                  onChange={e => set('unit', e.target.value as UnitSystem)}
                >
                  <option value="mm">mm</option>
                  <option value="feet">feet</option>
                  <option value="meters">m</option>
                </select>
              </div>
            )}
            {item.shape === 'circle' && (
              <div className="flex items-center gap-2 max-w-sm">
                <div className="flex-1">
                  <span className="text-xs text-slate-500 mb-1 block">Diameter (quoted as bounding square)</span>
                  <input type="number" step="1" min="0" className="input"
                    value={d.diameter || ''} onChange={e => setDim('diameter', parseFloat(e.target.value) || 0)} />
                </div>
                <div className="pt-5">
                  <select className="select" value={item.unit} onChange={e => set('unit', e.target.value as UnitSystem)}>
                    <option value="mm">mm</option>
                    <option value="feet">feet</option>
                    <option value="meters">m</option>
                  </select>
                </div>
              </div>
            )}
            {item.shape === 'triangle' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input type="number" step="1" min="0" className="input max-w-[160px]"
                    placeholder="Base (dim1)"
                    value={d.dim1 || ''} onChange={e => setDim('dim1', parseFloat(e.target.value) || 0)} />
                  <span className="text-slate-400">×</span>
                  <input type="number" step="1" min="0" className="input max-w-[160px]"
                    placeholder="Height (dim2)"
                    value={d.dim2 || ''} onChange={e => setDim('dim2', parseFloat(e.target.value) || 0)} />
                  <select className="select max-w-[100px]" value={item.unit} onChange={e => set('unit', e.target.value as UnitSystem)}>
                    <option value="mm">mm</option>
                    <option value="feet">feet</option>
                    <option value="meters">m</option>
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {['side1','side2','side3'].map((s, i) => (
                    <div key={s}>
                      <span className="text-xs text-slate-500 mb-1 block">Side {i+1} (perimeter)</span>
                      <input type="number" step="1" min="0" className="input"
                        value={d[s] || ''} onChange={e => setDim(s, parseFloat(e.target.value) || 0)} />
                    </div>
                  ))}
                </div>
              </div>
            )}
            {item.shape === 'l-shape' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-500">Two rectangular sections forming the L</p>
                <div className="grid grid-cols-2 gap-3">
                  {[['length1','Section A Length'],['width1','Section A Width'],['length2','Section B Length'],['width2','Section B Width']].map(([k,label]) => (
                    <div key={k}>
                      <span className="text-xs text-slate-500 mb-1 block">{label}</span>
                      <input type="number" step="1" min="0" className="input"
                        value={d[k] || ''} onChange={e => setDim(k, parseFloat(e.target.value) || 0)} />
                    </div>
                  ))}
                </div>
                <select className="select max-w-[140px]" value={item.unit} onChange={e => set('unit', e.target.value as UnitSystem)}>
                  <option value="mm">mm</option>
                  <option value="feet">feet</option>
                  <option value="meters">m</option>
                </select>
              </div>
            )}
          </div>

          {/* Joint detection (only when both dims > 5000mm for rectangles) */}
          {bothOver5k && (
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <label className="label">Joint Type (both dims &gt; 5000mm)</label>
              <div className="flex gap-2 flex-wrap">
                {(['none', 'center', 'off-center'] as JointType[]).map(j => (
                  <button key={j} type="button"
                    onClick={() => set('jointType', j)}
                    className={`px-3 py-2 rounded-lg border text-xs font-semibold transition-all ${
                      item.jointType === j
                        ? 'border-slate-700 bg-slate-800 text-white'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {j === 'none' ? 'No Joint (auto)' : j === 'center' ? 'Center Joint' : 'Off-Center Joint'}
                  </button>
                ))}
              </div>
              {item.jointType === 'off-center' && (
                <div className="mt-3 max-w-xs">
                  <label className="label">Joint Position (mm from one edge)</label>
                  <input type="number" min="0" className="input"
                    value={item.jointPosition || ''}
                    onChange={e => set('jointPosition', parseFloat(e.target.value) || 0)} />
                </div>
              )}
            </div>
          )}

          {/* Fabric */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Fabric Type</label>
              <select className="select" value={item.fabricType} onChange={e => set('fabricType', e.target.value)}>
                {FABRIC_OPTIONS.map(f => <option key={f}>{f}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-2 pt-5">
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input type="checkbox" className="rounded border-slate-300"
                  checked={item.withPrinting}
                  onChange={e => set('withPrinting', e.target.checked)} />
                Add Printing Charges
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input type="checkbox" className="rounded border-slate-300"
                  checked={item.withFleece}
                  onChange={e => set('withFleece', e.target.checked)} />
                Add Felt Pad / Fleece
              </label>
            </div>
          </div>

          {/* Gripper */}
          <div className="max-w-xs">
            <label className="label">Gripper Type</label>
            <select className="select" value={item.gripperType}
              onChange={e => set('gripperType', e.target.value as GripperType)}>
              {GRIPPER_OPTIONS.map(g => (
                <option key={g} value={g}>{g} Gripper</option>
              ))}
            </select>
          </div>

          {/* Lighting */}
          <div>
            <label className="label">Lighting</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {LIGHT_OPTIONS.map(opt => (
                <button
                  key={opt.value} type="button"
                  onClick={() => set('lightType', opt.value)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    item.lightType === opt.value
                      ? 'border-slate-700 bg-slate-800 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="text-sm font-medium">{opt.label}</div>
                  {opt.note && <div className={`text-xs mt-0.5 ${item.lightType === opt.value ? 'text-slate-300' : 'text-slate-400'}`}>{opt.note}</div>}
                </button>
              ))}
            </div>
          </div>

          {/* Light sub-options */}
          {hasLights && (
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-4">
              <div>
                <label className="label">Cove Depth</label>
                <div className="flex flex-wrap gap-2">
                  {DEPTH_OPTIONS.map(d => (
                    <button
                      key={d} type="button"
                      onClick={() => set('lightDepth', d)}
                      className={`px-3 py-1.5 rounded-lg border text-sm font-semibold transition-all ${
                        item.lightDepth === d
                          ? 'border-slate-700 bg-slate-800 text-white'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {d}"
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-1.5">
                  {stripCount} strip{stripCount !== 1 ? 's' : ''} at {item.lightDepth}" depth
                </p>
              </div>
              <div>
                <label className="label">LED Module Width</label>
                <div className="flex gap-2">
                  {(['standard', 'wider'] as LEDWidth[]).map(w => (
                    <button
                      key={w} type="button"
                      onClick={() => set('ledWidth', w)}
                      className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                        item.ledWidth === w
                          ? 'border-slate-700 bg-slate-800 text-white'
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

          {/* Smart calc mini-panel */}
          {preview && (d.dim1 > 0 || d.dim2 > 0 || d.diameter > 0) && (
            <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-lg text-xs text-indigo-800 space-y-1">
              <p className="font-semibold text-indigo-900 mb-2">Smart Calc Preview</p>
              {preview.fabricDetail.panels.map((panel, i) => (
                <p key={i}>• Roll: {panel.orientation} | Waste: {panel.wastageArea.toFixed(2)} sqm ({panel.wastagePercent.toFixed(1)}%)</p>
              ))}
              {preview.ledDetail && (
                <p>• LED: {preview.ledDetail.stripCount} strip{preview.ledDetail.stripCount > 1 ? 's' : ''} × {preview.ledDetail.runningLengthM.toFixed(2)}m = {preview.ledDetail.totalRunningMeters} mtr running | {preview.ledDetail.totalWatts}W total</p>
              )}
              <p>• Gripper: {round2(preview.perimeterM).toFixed(2)} rmt {item.gripperType}</p>
              <p className="font-semibold pt-1">Item subtotal: {fmtINR(preview.subtotalFinal)} + {fmtINR(preview.installationCost)} install</p>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="label">Notes (optional)</label>
            <textarea
              className="input resize-none h-16"
              placeholder="Special requirements for this ceiling…"
              value={item.notes}
              onChange={e => set('notes', e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
