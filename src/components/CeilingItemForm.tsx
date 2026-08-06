'use client'

import { Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { useState, useMemo } from 'react'
import type { CeilingItem, ShapeType, LightType, GripperType, LEDWidth, UnitSystem, SurfaceType, JointType, ManualRates } from '@/lib/types'
import { FABRIC } from '@/lib/pricing'
import { calculateItem, fmtINR, round2, manualDriverWarning } from '@/lib/calculations'
import { SC_WATTS_PER_M_STANDARD, SC_WATTS_PER_M_12DOT, LED_WATTS_PER_M } from '@/lib/pricing'

const FABRIC_OPTIONS = Object.keys(FABRIC)

const LIGHT_OPTIONS: { value: LightType; label: string; note?: string }[] = [
  { value: 'none', label: 'No Lighting' },
  { value: 'single_color', label: 'Single Colour', note: 'Fixed white, non-dimmable' },
  { value: 'single_color_dimmable', label: 'Single Colour Dimmable', note: 'DALI-2 or non-DALI' },
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
    ledSpacingMM: 125,
    ledModuleType: 'standard',
    daliDriver: 'dt8',
    driverOverrides: {},
    preferredDriverWatt: undefined,
    lightingConfig: 'non_looped',
    marginMM: 0,
    printingRatePerSqm: undefined,
    notes: '',
  }
}

interface Props {
  item: CeilingItem
  index: number
  priceTier: import('@/lib/types').PriceTier
  installRatePerSqft?: number
  manualRates?: ManualRates
  onChange: (item: CeilingItem) => void
  onRemove: () => void
}

export default function CeilingItemForm({ item, index, priceTier, installRatePerSqft, manualRates, onChange, onRemove }: Props) {
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

  // Compute dimensions in mm for roll-width eligibility checks
  const dim1MM = item.unit === 'mm' ? (d.dim1 ?? 0) : item.unit === 'feet' ? (d.dim1 ?? 0) * 304.8 : (d.dim1 ?? 0) * 1000
  const dim2MM = item.unit === 'mm' ? (d.dim2 ?? 0) : item.unit === 'feet' ? (d.dim2 ?? 0) * 304.8 : (d.dim2 ?? 0) * 1000
  const d1FitsRoll = dim1MM > 0 && dim1MM <= 5000
  const d2FitsRoll = dim2MM > 0 && dim2MM <= 5000
  const neitherFitsRoll = item.shape === 'rectangle' && dim1MM > 0 && dim2MM > 0 && !d1FitsRoll && !d2FitsRoll
  const onlyOneFitsRoll = item.shape === 'rectangle' && (d1FitsRoll !== d2FitsRoll)

  // Live calc preview
  const preview = useMemo(() => {
    try {
      return calculateItem(item, priceTier, installRatePerSqft, manualRates)
    } catch {
      return null
    }
  }, [item, priceTier, installRatePerSqft, manualRates])

  const stripCount = hasLights ? Math.max(1, Math.floor((item.lightDepth ?? 6) / 6)) : 0

  return (
    <div className="card overflow-hidden">
      {/* Item header */}
      <div
        className="flex items-center justify-between px-5 py-3.5 cursor-pointer transition-colors"
        style={{ background: 'var(--sheet-2)', borderBottom: '1px solid var(--rule)' }}
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] font-medium shrink-0" style={{ color: 'var(--accent)' }}>
            {String(index + 1).padStart(2, '0')}
          </span>
          <div>
            <span className="font-display font-semibold text-[14px]" style={{ color: 'var(--ink)' }}>
              {item.name || `Ceiling ${index + 1}`}
            </span>
            {!open && (d.dim1 > 0 || d.dim2 > 0) && (
              <span className="fig text-[11px] ml-2.5" style={{ color: 'var(--muted)' }}>
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
                        ? 'border-[color:var(--ink)] bg-white text-[color:var(--ink)] shadow-[inset_3px_0_0_var(--accent)]'
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
                key={`qty-${item.id}`}
                type="number" min={1} className="input"
                defaultValue={item.quantity}
                onBlur={e => { const v = parseInt(e.target.value); if (!isNaN(v) && v >= 1) set('quantity', v); else e.target.value = String(item.quantity) }}
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

          {/* Joint option — always available for rectangles */}
          {item.shape === 'rectangle' && dim1MM > 0 && dim2MM > 0 && (
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <label className="label mb-1">Joint Option</label>
              {neitherFitsRoll && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 mb-2">
                  Both dimensions exceed 5m — a joint is required. Select center or off-center below.
                </p>
              )}
              {onlyOneFitsRoll && (
                <p className="text-xs text-slate-500 mb-2">
                  {dim1MM > 5000 || dim2MM > 5000
                    ? `One dimension exceeds 5m max roll width — without joint, the fabric is oriented so the fitting dimension is the roll axis. With joint, the larger dimension is split so each piece fits a smaller roll (lower wastage).`
                    : 'Both dimensions fit within available rolls. A joint reduces billed area when split orientation gives lower wastage.'}
                </p>
              )}
              {!neitherFitsRoll && !onlyOneFitsRoll && (
                <p className="text-xs text-slate-500 mb-2">
                  Both dimensions fit available rolls. Without joint, the lower-waste orientation is used automatically. With joint, the fabric is split for even lower wastage or client preference.
                </p>
              )}
              <div className="flex gap-2 flex-wrap">
                {(['none', 'center', 'off-center'] as JointType[]).map(j => (
                  <button key={j} type="button"
                    onClick={() => set('jointType', j)}
                    className={`px-3 py-2 rounded-lg border text-xs font-semibold transition-all ${
                      item.jointType === j
                        ? 'border-[color:var(--ink)] bg-white text-[color:var(--ink)] shadow-[inset_3px_0_0_var(--accent)]'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {j === 'none' ? 'No Joint' : j === 'center' ? 'Center Joint' : 'Off-Center Joint'}
                  </button>
                ))}
              </div>
              {item.jointType !== 'none' && (
                <p className="text-xs text-indigo-600 mt-2">
                  Joint: the larger dimension is split. Each half becomes a roll-axis piece; the smaller dimension is the cut length. See Smart Calc Preview for exact panels and wastage.
                </p>
              )}
              {item.jointType === 'off-center' && (
                <div className="mt-3 max-w-xs">
                  <label className="label">Joint Position (mm from one end of the larger dimension)</label>
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
              {item.withPrinting && (
                <div className="ml-6 max-w-[160px]">
                  <label className="label text-xs">Printing Rate (₹/sqm)</label>
                  <input
                    type="number" min="0" step="50" className="input text-sm"
                    placeholder="Standard rate"
                    value={item.printingRatePerSqm ?? ''}
                    onChange={e => {
                      const v = parseFloat(e.target.value)
                      set('printingRatePerSqm', isNaN(v) ? undefined : v)
                    }}
                  />
                  <p className="text-xs text-slate-400 mt-0.5">Leave blank for standard</p>
                </div>
              )}
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input type="checkbox" className="rounded border-slate-300"
                  checked={item.withFleece}
                  onChange={e => set('withFleece', e.target.checked)} />
                Add Felt Pad / Fleece
              </label>
            </div>
          </div>

          {/* Fabric margin */}
          {item.shape !== 'circle' && (
            <div className="max-w-[220px]">
              <label className="label">Fabric Margin (mm per side)</label>
              <input
                key={`margin-${item.id}`}
                type="number" min="0" max="500" step="10" className="input"
                defaultValue={item.marginMM ?? 0}
                onBlur={e => {
                  const v = parseInt(e.target.value)
                  set('marginMM', isNaN(v) || v < 0 ? 0 : v)
                  if (isNaN(v)) e.target.value = String(item.marginMM ?? 0)
                }}
              />
              <p className="text-xs text-slate-500 mt-1">
                Smart: margin moves to cut side if it would jump to a wider roll. Affects fabric cost only.
              </p>
            </div>
          )}

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
                  onClick={() => {
                    const isSC = opt.value === 'single_color' || opt.value === 'single_color_dimmable'
                    const defaultSpacing = isSC ? 150 : 125
                    onChange({ ...item, lightType: opt.value, ledSpacingMM: defaultSpacing })
                  }}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    item.lightType === opt.value
                      ? 'border-[color:var(--ink)] bg-white text-[color:var(--ink)] shadow-[inset_3px_0_0_var(--accent)]'
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
                          ? 'border-[color:var(--ink)] bg-white text-[color:var(--ink)] shadow-[inset_3px_0_0_var(--accent)]'
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
                          ? 'border-[color:var(--ink)] bg-white text-[color:var(--ink)] shadow-[inset_3px_0_0_var(--accent)]'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {w.charAt(0).toUpperCase() + w.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              {item.lightType === 'tunable_dali' && (
                <div>
                  <label className="label">DALI Driver Type</label>
                  <div className="flex gap-2">
                    {([['dt8', 'DT8 150W'], ['da4m', 'DA4m']] as const).map(([val, label]) => (
                      <button key={val} type="button"
                        onClick={() => set('daliDriver', val)}
                        className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                          (item.daliDriver ?? 'dt8') === val
                            ? 'border-[color:var(--ink)] bg-white text-[color:var(--ink)] shadow-[inset_3px_0_0_var(--accent)]'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        }`}
                      >{label}</button>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Max 10 modules per driver · DA4m at 1 per 3 DT8</p>
                </div>
              )}
              {/* Feature 2: Single Colour Dimmable — DALI vs Without DALI */}
              {item.lightType === 'single_color_dimmable' && (
                <div>
                  <label className="label">Dimmable Driver System</label>
                  <div className="flex gap-2 flex-wrap">
                    {([[false, 'DALI-2 (DT2 + DA4m)'], [true, 'Without DALI (EV1 + V1 + RT1)']] as const).map(([val, label]) => (
                      <button key={String(val)} type="button"
                        onClick={() => onChange({ ...item, dimmableWithoutDali: val, driverOverrides: {} })}
                        className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                          !!item.dimmableWithoutDali === val
                            ? 'border-[color:var(--ink)] bg-white text-[color:var(--ink)] shadow-[inset_3px_0_0_var(--accent)]'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        }`}
                      >{label}</button>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {item.dimmableWithoutDali
                      ? 'Without DALI: standard drivers · Power Repeaters = drivers · 1 Controller per 3 repeaters · 1 Remote.'
                      : 'DALI-2: DT2 200W driver (max 13 modules) + DA4m (1 per 3 drivers). Existing behaviour.'}
                  </p>
                </div>
              )}
              {/* Feature 3: RGB/RGBW — Analog vs DALI system */}
              {(item.lightType === 'rgb' || item.lightType === 'rgbw') && (
                <div>
                  <label className="label">Driver System</label>
                  <div className="flex gap-2 flex-wrap">
                    {([[false, 'Analog (V2 + Repeater + Remote)'], [true, 'DALI (DA4M/DA5M per driver)']] as const).map(([val, label]) => (
                      <button key={String(val)} type="button"
                        onClick={() => onChange({ ...item, rgbDali: val, driverOverrides: {} })}
                        className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                          !!item.rgbDali === val
                            ? 'border-[color:var(--ink)] bg-white text-[color:var(--ink)] shadow-[inset_3px_0_0_var(--accent)]'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        }`}
                      >{label}</button>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {item.rgbDali
                      ? `DALI: one ${item.lightType === 'rgbw' ? 'DA5M' : 'DA4M'} controller per driver · no power repeater or remote.`
                      : 'Analog: standard drivers + V2 Controller + remote (existing system).'}
                  </p>
                </div>
              )}
              {(item.lightType === 'single_color' || item.lightType === 'tunable' || (item.lightType === 'single_color_dimmable' && item.dimmableWithoutDali)) && (
                <div>
                  <label className="label">Driver Size</label>
                  <div className="flex gap-2 flex-wrap">
                    {([
                      [undefined, 'Auto (best mix)'],
                      ['600W', '600W'],
                      ['400W', '400W'],
                      ['350W', '350W'],
                      ['200W', '200W'],
                      ['150W', '150W'],
                      ['100W', '100W'],
                      ['50W',  '50W'],
                    ] as const).map(([val, label]) => (
                      <button key={val ?? 'auto'} type="button"
                        onClick={() => onChange({ ...item, preferredDriverWatt: val, driverOverrides: {} })}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                          (item.preferredDriverWatt ?? undefined) === val
                            ? 'border-[color:var(--ink)] bg-white text-[color:var(--ink)] shadow-[inset_3px_0_0_var(--accent)]'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        }`}
                      >{label}</button>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Auto prefers 200W drivers (600W runs hot and needs a fan — avoided unless necessary). Override to force a single size.</p>
                </div>
              )}
              {/* Looped / Non-Looped lighting configuration */}
              <div>
                <label className="label">Lighting Configuration</label>
                <div className="flex gap-2">
                  {([['non_looped', 'Non-Looped'], ['looped', 'Looped']] as const).map(([val, label]) => (
                    <button key={val} type="button"
                      onClick={() => onChange({ ...item, lightingConfig: val, driverOverrides: {} })}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                        (item.lightingConfig ?? 'non_looped') === val
                          ? 'border-[color:var(--ink)] bg-white text-[color:var(--ink)] shadow-[inset_3px_0_0_var(--accent)]'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >{label}</button>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {(item.lightingConfig ?? 'non_looped') === 'looped'
                    ? 'Looped: all pieces run as one continuous system — drivers sized once from combined wattage (usually fewer drivers).'
                    : 'Non-Looped: each ceiling is an independent circuit — drivers calculated per piece × quantity.'}
                </p>
              </div>
              {/* Feature 1: Item Looping — loop this item together with other items */}
              <div>
                <label className="label">Item Loop Group</label>
                <div className="flex gap-2 flex-wrap">
                  {([[0, 'None'], [1, 'Group 1'], [2, 'Group 2'], [3, 'Group 3']] as const).map(([val, label]) => (
                    <button key={val} type="button"
                      onClick={() => onChange({ ...item, loopGroup: val || undefined, driverOverrides: {} })}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                        (item.loopGroup ?? 0) === val
                          ? 'border-[color:var(--ink)] bg-white text-[color:var(--ink)] shadow-[inset_3px_0_0_var(--accent)]'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >{label}</button>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Items placed in the same group are looped together — their LED wattage is combined and drivers are sized once for the whole group. Set the same group on the items you want to loop (e.g. Item 1 &amp; Item 4).
                </p>
              </div>
              {/* 12-dot module option for single colour */}
              {(item.lightType === 'single_color' || item.lightType === 'single_color_dimmable') && (
                <div>
                  <label className="label">Module Type</label>
                  <div className="flex gap-2">
                    {([['standard', 'Standard'], ['12dot', '12 Dot']] as const).map(([val, label]) => (
                      <button key={val} type="button"
                        onClick={() => set('ledModuleType', val)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                          (item.ledModuleType ?? 'standard') === val
                            ? 'border-[color:var(--ink)] bg-white text-[color:var(--ink)] shadow-[inset_3px_0_0_var(--accent)]'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        }`}
                      >{label}</button>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">12 Dot = 12-dot/m module (same 13W/m)</p>
                </div>
              )}
              <div className="max-w-[160px]">
                <label className="label">Strip Gap (mm)</label>
                <input
                  key={`spacing-${item.id}`}
                  type="number" min="50" max="500" step="5" className="input"
                  defaultValue={item.ledSpacingMM ?? 125}
                  onBlur={e => {
                    const v = parseFloat(e.target.value)
                    if (!isNaN(v) && v > 0) set('ledSpacingMM', v)
                    else e.target.value = String(item.ledSpacingMM ?? 125)
                  }}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Default: {(item.lightType === 'single_color' || item.lightType === 'single_color_dimmable') ? '150' : '125'}mm
                </p>
              </div>
            </div>
          )}

          {/* Smart calc mini-panel */}
          {preview && (d.dim1 > 0 || d.dim2 > 0 || d.diameter > 0) && (
            <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-lg text-xs text-indigo-800 space-y-1">
              <p className="font-semibold text-indigo-900 mb-2">Smart Calc Preview</p>
              {preview.fabricDetail.panels.map((panel, i) => (
                <p key={i}>• {preview.fabricDetail.panels.length > 1 ? `Panel ${i+1}: ` : ''}Roll: {panel.orientation} | Waste: {panel.wastageArea.toFixed(2)} sqm ({panel.wastagePercent.toFixed(1)}%)</p>
              ))}
              {preview.fabricDetail.panels.length > 1 ? (
                <p>• Total billed fabric: {round2(preview.fabricDetail.totalBilledArea * item.quantity).toFixed(2)} sqm{item.quantity > 1 ? ` (${preview.fabricDetail.totalBilledArea.toFixed(2)} × ${item.quantity})` : ''}</p>
              ) : (
                <p>• Fabric billed: {round2(preview.fabricDetail.totalBilledArea * item.quantity).toFixed(2)} sqm{item.quantity > 1 ? ` (${preview.fabricDetail.totalBilledArea.toFixed(2)} × ${item.quantity})` : ''}</p>
              )}
              {preview.ledDetail && (
                <p>• LED: {preview.ledDetail.stripCount * item.quantity} strip{preview.ledDetail.stripCount * item.quantity > 1 ? 's' : ''}{item.quantity > 1 ? ` (${preview.ledDetail.stripCount}×${item.quantity})` : ''} × {preview.ledDetail.runningLengthM.toFixed(2)}m = {round2(preview.ledDetail.totalRunningMeters * item.quantity)} mtr running | {round2(preview.ledDetail.totalWatts * item.quantity)}W total</p>
              )}
              {(() => {
                const panels = preview.fabricDetail.panels
                const hasJoint = preview.fabricDetail.hasJoint && panels.length > 1
                // Gripper comes in 1m lengths — always rounded UP to whole metres per ceiling
                const gripperQty = hasJoint
                  ? Math.ceil(panels.reduce((s, p) => s + 2 * (p.physicalWidth + p.cutLength), 0))
                  : Math.ceil(preview.perimeterM)
                const jointNote = hasJoint
                  ? ` (${panels.map((p, i) => `P${i+1}: 2×(${p.physicalWidth.toFixed(2)}+${p.cutLength.toFixed(2)})m`).join(', ')})`
                  : ''
                return (
                  <p>• Gripper: {gripperQty * item.quantity} rmt {item.gripperType}{item.quantity > 1 ? ` (${gripperQty} × ${item.quantity})` : ''} — rounded up to whole metres{jointNote}</p>
                )
              })()}
              {/* Drivers & Controls with manual override */}
              {(() => {
                const driverItems = preview.lineItems.filter(l => l.unit === 'nos')
                if (!driverItems.length) return null
                // We need the "auto-calculated" qty before overrides — re-derive from overrides map
                // The preview already has overrides applied, so we read calculated qty from a fresh preview without overrides
                const autoPreview = (() => {
                  try {
                    return calculateItem({ ...item, driverOverrides: {} }, priceTier, installRatePerSqft, manualRates)
                  } catch { return null }
                })()
                const autoItems = autoPreview?.lineItems.filter(l => l.unit === 'nos') ?? []
                return (
                  <div className="mt-2 pt-2 border-t border-indigo-200">
                    <p className="font-semibold text-indigo-900 mb-1.5">Drivers &amp; Controls <span className="font-normal text-indigo-600">(edit qty freely)</span></p>
                    <div className="space-y-1.5">
                      {autoItems.map((auto, i) => {
                        const overrideVal = (item.driverOverrides ?? {})[auto.description]
                        const displayQty = overrideVal !== undefined ? overrideVal : auto.qty
                        const isOverridden = overrideVal !== undefined && overrideVal !== auto.qty
                        return (
                          <div key={i} className="flex items-center gap-2">
                            <input
                              type="number"
                              min={0}
                              key={`${auto.description}-${auto.qty}-${overrideVal ?? 'x'}`}
                              defaultValue={displayQty}
                              onBlur={e => {
                                const v = parseInt(e.target.value)
                                if (isNaN(v) || v < 0) return
                                const newOv = { ...(item.driverOverrides ?? {}) }
                                if (v === auto.qty) {
                                  delete newOv[auto.description]
                                } else {
                                  newOv[auto.description] = v
                                }
                                onChange({ ...item, driverOverrides: newOv })
                              }}
                              className="w-14 px-1.5 py-0.5 rounded border border-indigo-300 bg-white text-indigo-900 text-center text-xs"
                            />
                            <span className="text-indigo-700 text-xs">×</span>
                            <span className={`text-xs ${isOverridden ? 'text-indigo-600 font-medium' : ''}`}>
                              {auto.description.replace(/ \[.*?\]/, '')}
                            </span>
                            {isOverridden && (
                              <span className="text-indigo-400 text-xs">(auto: {auto.qty})</span>
                            )}
                            {isOverridden && (
                              <button
                                type="button"
                                className="text-indigo-400 underline text-xs ml-1"
                                onClick={() => {
                                  const newOv = { ...(item.driverOverrides ?? {}) }
                                  delete newOv[auto.description]
                                  onChange({ ...item, driverOverrides: newOv })
                                }}
                              >reset</button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })()}
              {/* Advisory: manual driver capacity vs auto best mix (>30% = warn, never blocks) */}
              {(() => {
                if (!item.preferredDriverWatt || !preview.ledDetail) return null
                const isSC = item.lightType === 'single_color' || item.lightType === 'single_color_dimmable'
                const wattsPerM = isSC
                  ? (item.ledModuleType === '12dot' ? SC_WATTS_PER_M_12DOT : SC_WATTS_PER_M_STANDARD)
                  : LED_WATTS_PER_M
                const isLooped = item.lightingConfig === 'looped'
                const totalModules = isLooped
                  ? preview.ledDetail.totalRunningMeters * Math.max(1, item.quantity)
                  : preview.ledDetail.totalRunningMeters
                const warning = manualDriverWarning(totalModules, wattsPerM, item.preferredDriverWatt)
                if (!warning) return null
                return (
                  <div className="mt-2 p-3 bg-amber-50 border border-amber-300 rounded-lg text-amber-800 text-xs flex gap-2">
                    <span className="shrink-0">⚠</span>
                    <span>{warning}</span>
                  </div>
                )
              })()}
              <p className="font-semibold pt-1">Item total{item.quantity > 1 ? ` (×${item.quantity})` : ''}: {fmtINR(preview.itemTotal)}</p>
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
