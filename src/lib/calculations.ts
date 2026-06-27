import type {
  CeilingItem, PriceTier, FabricDetail, FabricPanel, LEDDetail,
  LineItem, ItemBreakdown, QuoteBreakdown, Quote,
  TwoDims, CircleDims, TriangleDims,
} from './types'
import {
  FABRIC, PRINTING, GRIPPER, LED, LED_WATTS_PER_M,
  STANDARD_DRIVERS, DALI2_DRIVE_200W, DT8_150W,
  CONTROLS, FLEECE, ROLL_WIDTHS, p,
  INSTALLATION_RATE_PER_SQFT, SQFT_PER_SQM,
} from './pricing'

const FT = 0.3048
const MM = 0.001

export function toM(v: number, unit: 'mm' | 'feet' | 'meters'): number {
  if (unit === 'feet') return v * FT
  if (unit === 'mm') return v * MM
  return v
}

function toMM(v: number, unit: 'mm' | 'feet' | 'meters'): number {
  return toM(v, unit) * 1000
}

// Read dimensions backward-compatibly (old: length/width, new: dim1/dim2)
function readTwoDims(dims: unknown): { dim1: number; dim2: number } {
  const d = dims as Record<string, number>
  if (typeof d.dim1 === 'number') return { dim1: d.dim1, dim2: d.dim2 }
  // legacy
  if (typeof d.length === 'number') return { dim1: d.length, dim2: d.width }
  return { dim1: 0, dim2: 0 }
}

// Returns null when no available roll can fit this width (> 5m max)
function bestRollForWidth(widthM: number): number | null {
  const widthMM = widthM * 1000
  const fit = ROLL_WIDTHS.find(r => r * 1000 >= widthMM)
  return fit ?? null
}

function makePanel(
  rollAxisM: number,  // the dimension used as roll width (must fit in a roll)
  cutLengthM: number,
  isJoint: boolean,
): FabricPanel {
  const roll = bestRollForWidth(rollAxisM) ?? 5 // 5m fallback for edge cases
  const panelArea = round2(roll * cutLengthM)
  const usedArea = round2(rollAxisM * cutLengthM)
  const wastageArea = round2(panelArea - usedArea)
  const wastagePercent = panelArea > 0 ? round2((wastageArea / panelArea) * 100) : 0
  return {
    rollWidth: roll,
    physicalWidth: round2(rollAxisM),
    cutLength: round2(cutLengthM),
    panelArea,
    usedArea,
    wastageArea,
    wastagePercent,
    orientation: `${roll}m roll × ${cutLengthM.toFixed(2)}m cut`,
    isJoint,
  }
}

// Determine the no-joint orientation: which dim is the roll axis, which is the cut length
function orientNoJoint(d1M: number, d2M: number): { rollWidthM: number; cutLengthM: number; needsJoint: boolean } {
  const roll1 = bestRollForWidth(d1M)
  const roll2 = bestRollForWidth(d2M)

  if (roll1 !== null && roll2 !== null) {
    // Both fit — pick by min wastage
    const waste1 = (roll1 - d1M) * d2M
    const waste2 = (roll2 - d2M) * d1M
    return waste1 <= waste2
      ? { rollWidthM: d1M, cutLengthM: d2M, needsJoint: false }
      : { rollWidthM: d2M, cutLengthM: d1M, needsJoint: false }
  }
  if (roll1 !== null) return { rollWidthM: d1M, cutLengthM: d2M, needsJoint: false }
  if (roll2 !== null) return { rollWidthM: d2M, cutLengthM: d1M, needsJoint: false }
  // Neither fits — both > 5m, joint is required
  return { rollWidthM: Math.min(d1M, d2M), cutLengthM: Math.max(d1M, d2M), needsJoint: true }
}

// For center joint: find the best split — try splitting each dimension, pick less wastage
// Splitting a dim means each half becomes the roll axis, the other dim becomes cut length
function bestCenterJointPanels(d1M: number, d2M: number): { panels: FabricPanel[]; desc: string } {
  const larger = Math.max(d1M, d2M)
  const smaller = Math.min(d1M, d2M)

  // Option A: split the larger dimension — each half is roll axis, smaller is cut length
  const halfLarge = larger / 2
  const rollA = bestRollForWidth(halfLarge) ?? 5
  const wasteA = (rollA - halfLarge) * smaller * 2

  // Option B: split the smaller dimension — each half is roll axis, larger is cut length
  const halfSmall = smaller / 2
  const rollB = bestRollForWidth(halfSmall) ?? 5
  const wasteB = (rollB - halfSmall) * larger * 2

  if (wasteA <= wasteB) {
    return {
      panels: [makePanel(halfLarge, smaller, true), makePanel(halfLarge, smaller, true)],
      desc: `Center joint at ${(halfLarge * 1000).toFixed(0)}mm from each end (${(larger * 1000).toFixed(0)}mm dimension split)`,
    }
  }
  return {
    panels: [makePanel(halfSmall, larger, true), makePanel(halfSmall, larger, true)],
    desc: `Center joint at ${(halfSmall * 1000).toFixed(0)}mm from each end (${(smaller * 1000).toFixed(0)}mm dimension split)`,
  }
}

function computeFabricDetail(
  d1M: number,  // raw input dimension 1 (not pre-oriented)
  d2M: number,  // raw input dimension 2 (not pre-oriented)
  item: CeilingItem,
): FabricDetail {
  const larger = Math.max(d1M, d2M)
  const smaller = Math.min(d1M, d2M)

  let panels: FabricPanel[] = []
  let jointPositionDesc = ''

  if (item.jointType === 'none') {
    const { rollWidthM, cutLengthM } = orientNoJoint(d1M, d2M)
    panels = [makePanel(rollWidthM, cutLengthM, false)]
    jointPositionDesc = 'No joint'
  } else if (item.jointType === 'center') {
    const { panels: p, desc } = bestCenterJointPanels(d1M, d2M)
    panels = p
    jointPositionDesc = desc
  } else {
    // off-center: split the larger dimension at jointPosition mm from one end
    const posM = (item.jointPosition ?? 0) / 1000
    const p1 = Math.max(0.01, posM)
    const p2 = Math.max(0.01, larger - p1)
    panels = [makePanel(p1, smaller, true), makePanel(p2, smaller, true)]
    jointPositionDesc = `Joint at ${item.jointPosition}mm from one end (${(larger * 1000).toFixed(0)}mm dimension split)`
  }

  const totalBilledArea = round2(panels.reduce((s, p) => s + p.panelArea, 0))
  const totalUsedArea = round2(panels.reduce((s, p) => s + p.usedArea, 0))
  const totalWastageArea = round2(panels.reduce((s, p) => s + p.wastageArea, 0))

  // Legacy-compat single-panel fields
  const first = panels[0]
  return {
    panels,
    totalBilledArea,
    totalUsedArea,
    totalWastageArea,
    hasJoint: item.jointType !== 'none' && panels.length > 1,
    jointPosition: jointPositionDesc,
    // legacy
    rollWidth: first.rollWidth,
    cutLength: first.cutLength,
    totalArea: totalBilledArea,
    usedArea: totalUsedArea,
    wastageArea: totalWastageArea,
    wastagePercent: totalBilledArea > 0 ? round2((totalWastageArea / totalBilledArea) * 100) : 0,
    orientation: first.orientation,
  }
}

function getGeometry(item: CeilingItem) {
  const u = item.unit
  switch (item.shape) {
    case 'rectangle': {
      const { dim1, dim2 } = readTwoDims(item.dimensions)
      const d1M = toM(dim1, u), d2M = toM(dim2, u)
      const d1MM = toMM(dim1, u), d2MM = toMM(dim2, u)
      // widthM = the dimension that must be the roll axis (fits in a ≤5m roll)
      // If only one fits it's forced; if both fit pick min wastage; if neither, use smaller
      const { rollWidthM, cutLengthM } = orientNoJoint(d1M, d2M)
      return {
        dim1M: d1M, dim2M: d2M,
        widthM: rollWidthM, lengthM: cutLengthM,
        areaM2: d1M * d2M,
        perimeterM: 2 * (d1M + d2M),
        dim1MM: d1MM, dim2MM: d2MM,
      }
    }
    case 'circle': {
      const d = item.dimensions as CircleDims
      const D = toM(d.diameter, u)
      return {
        dim1M: D, dim2M: D,
        widthM: D, lengthM: D,
        areaM2: D * D,
        perimeterM: Math.PI * D,
        dim1MM: D * 1000, dim2MM: D * 1000,
      }
    }
    case 'triangle': {
      const raw = item.dimensions as unknown as Record<string, number>
      // Support both old (base/height) and new (dim1/dim2)
      const dim1 = raw.dim1 ?? raw.base ?? 0
      const dim2 = raw.dim2 ?? raw.height ?? 0
      const s1 = raw.side1 ?? 0, s2 = raw.side2 ?? 0, s3 = raw.side3 ?? 0
      const b = toM(dim1, u), h = toM(dim2, u)
      return {
        dim1M: b, dim2M: h,
        widthM: Math.min(b, h), lengthM: Math.max(b, h),
        areaM2: 0.5 * b * h,
        perimeterM: toM(s1, u) + toM(s2, u) + toM(s3, u),
        dim1MM: b * 1000, dim2MM: h * 1000,
      }
    }
    case 'l-shape': {
      // L-shape uses old dims format still
      const d = item.dimensions as unknown as Record<string, number>
      const L1 = toM(d.length1 ?? d.dim1 ?? 0, u)
      const W1 = toM(d.width1 ?? d.dim2 ?? 0, u)
      const L2 = toM(d.length2 ?? 0, u)
      const W2 = toM(d.width2 ?? 0, u)
      const totalLength = L1 + L2
      const maxWidth = Math.max(W1, W2)
      const area = L1 * W1 + L2 * W2
      const perim = 2 * (L1 + W1 + L2 + W2) - 2 * Math.min(W1, W2)
      return {
        dim1M: totalLength, dim2M: maxWidth,
        widthM: maxWidth, lengthM: totalLength,
        areaM2: area,
        perimeterM: perim,
        dim1MM: totalLength * 1000, dim2MM: maxWidth * 1000,
      }
    }
  }
}

function ledKey(item: CeilingItem): string {
  if (item.lightType === 'tunable' || item.lightType === 'tunable_dali')
    return item.ledWidth === 'wider' ? 'Wider Tunable' : 'Tunable'
  if (item.lightType === 'rgb') return 'RGB'
  if (item.lightType === 'rgbw') return 'RGBW/NW/WW'
  return item.ledWidth === 'wider' ? 'Wider Single Colour' : 'Single Colour'
}

// Module-count limits per driver type (per Pongs LED Module & Driver Guide)
const DALI_TW_MOD_PER_DRV  = 10  // DT8 150W / DA4m — tunable white DALI (max 10 modules)
const DALI_SC_MOD_PER_DRV  = 13  // DT2 200W  — single colour DALI dimmable

// Standard driver module capacities (module count, not watt-based)
const STD_TW_DRIVERS = [
  { key: '600W', modules: 38 },
  { key: '450W', modules: 28 },
  { key: '200W', modules: 13 },
]
// Single colour uses 80% of driver capacity: 600W→36, 450W→27, 200W→12
const STD_SC_DRIVERS = [
  { key: '600W', modules: 36 },
  { key: '450W', modules: 27 },
  { key: '200W', modules: 12 },
]

// Greedily pack modules into fewest drivers, using largest first
function packDrivers(totalModules: number, specs: { key: string; modules: number }[]): Record<string, number> {
  const sorted = [...specs].sort((a, b) => b.modules - a.modules)
  const counts: Record<string, number> = {}
  let rem = totalModules
  while (rem > 0) {
    const fit = sorted.find(s => s.modules >= rem)
    if (fit) { counts[fit.key] = (counts[fit.key] || 0) + 1; rem = 0 }
    else { counts[sorted[0].key] = (counts[sorted[0].key] || 0) + 1; rem -= sorted[0].modules }
  }
  return counts
}

function addCtrl(key: string, qty: number, tier: PriceTier): LineItem {
  const pr = CONTROLS[key]
  return { description: key, qty, unit: 'nos', dealerRate: pr.dealer, tierRate: p(pr, tier), dealerAmount: qty * pr.dealer, tierAmount: qty * p(pr, tier) }
}

function buildDriverLines(totalModules: number, lightType: string, tier: PriceTier, daliDriver?: 'dt8' | 'da4m'): LineItem[] {
  const items: LineItem[] = []

  if (lightType === 'tunable_dali') {
    const drvCount = Math.ceil(totalModules / DALI_TW_MOD_PER_DRV)
    const da4mCount = Math.ceil(drvCount / 3)
    if (daliDriver === 'da4m') {
      // DA4m as primary driver (max 10 modules each) + no separate DT8
      items.push(addCtrl('DA4m', drvCount, tier))
    } else {
      // DT8 150W as primary driver + DA4m at 1 per 3 DT8
      items.push({
        description: `DT8 150W Driver [max 10 modules each]`,
        qty: drvCount, unit: 'nos',
        dealerRate: DT8_150W.price.dealer, tierRate: p(DT8_150W.price, tier),
        dealerAmount: drvCount * DT8_150W.price.dealer, tierAmount: drvCount * p(DT8_150W.price, tier),
      })
      items.push(addCtrl('DA4m', da4mCount, tier))
    }

  } else if (lightType === 'single_color_dimmable') {
    // DT2 200W (DALI dimmable) — max 13 single colour modules per driver + DA4m at 1 per 3 drivers
    const drvCount = Math.ceil(totalModules / DALI_SC_MOD_PER_DRV)
    const da4mCount = Math.ceil(drvCount / 3)
    items.push({
      description: `DT2 200W Driver [max 13 modules each]`,
      qty: drvCount, unit: 'nos',
      dealerRate: DALI2_DRIVE_200W.price.dealer, tierRate: p(DALI2_DRIVE_200W.price, tier),
      dealerAmount: drvCount * DALI2_DRIVE_200W.price.dealer, tierAmount: drvCount * p(DALI2_DRIVE_200W.price, tier),
    })
    items.push(addCtrl('DA4m', da4mCount, tier))

  } else if (lightType === 'tunable') {
    // Standard Tunable White — 200W/450W/600W + EV2 + V2 Controller + RT2 Remote
    const drvCounts = packDrivers(totalModules, STD_TW_DRIVERS)
    for (const [name, qty] of Object.entries(drvCounts)) {
      const spec = STANDARD_DRIVERS[name]
      items.push({
        description: `${name} Driver (Tunable White)`,
        qty, unit: 'nos',
        dealerRate: spec.price.dealer, tierRate: p(spec.price, tier),
        dealerAmount: qty * spec.price.dealer, tierAmount: qty * p(spec.price, tier),
      })
    }
    items.push(addCtrl('EV2 Power Repeater', 1, tier))
    items.push(addCtrl('V2 Controller', 1, tier))
    items.push(addCtrl('RT2 Remote', 1, tier))

  } else if (lightType === 'single_color') {
    // Single Colour — 200W/450W/600W @ 80% capacity + EV1 + V1 + RT1
    const drvCounts = packDrivers(totalModules, STD_SC_DRIVERS)
    const totalDrivers = Object.values(drvCounts).reduce((a, b) => a + b, 0)
    for (const [name, qty] of Object.entries(drvCounts)) {
      const spec = STANDARD_DRIVERS[name]
      items.push({
        description: `${name} Driver (Single Colour)`,
        qty, unit: 'nos',
        dealerRate: spec.price.dealer, tierRate: p(spec.price, tier),
        dealerAmount: qty * spec.price.dealer, tierAmount: qty * p(spec.price, tier),
      })
    }
    items.push(addCtrl('EV1 Power Repeater', totalDrivers, tier))
    items.push(addCtrl('V1 Controller', 1, tier))
    items.push(addCtrl('RT1 Remote', 1, tier))

  } else if (lightType === 'rgb' || lightType === 'rgbw') {
    // RGB / RGBW — watt-based with 1.2 safety factor using 600W drivers
    const totalWatts = totalModules * LED_WATTS_PER_M
    const required = totalWatts * 1.2
    const count = Math.ceil(required / STANDARD_DRIVERS['600W'].watts)
    const spec = STANDARD_DRIVERS['600W']
    items.push({
      description: '600W Driver (RGB/RGBW)',
      qty: count, unit: 'nos',
      dealerRate: spec.price.dealer, tierRate: p(spec.price, tier),
      dealerAmount: count * spec.price.dealer, tierAmount: count * p(spec.price, tier),
    })
    items.push(addCtrl('V2 Controller', 1, tier))
    items.push(addCtrl('RT2 Remote', 1, tier))
  }

  return items
}

export function calculateItem(item: CeilingItem, tier: PriceTier, installRate?: number): ItemBreakdown {
  const geo = getGeometry(item)
  const { widthM, lengthM, areaM2, perimeterM } = geo
  const lineItems: LineItem[] = []

  // Fabric — pass raw dimensions so computeFabricDetail can pick orientation by joint type
  const fabricDetail = computeFabricDetail(geo.dim1M, geo.dim2M, item)
  const fabPrice = FABRIC[item.fabricType] ?? FABRIC['Descor Premium']
  lineItems.push({
    description: `${item.fabricType} Fabric [${fabricDetail.panels[0]?.orientation ?? ''}, waste ${fabricDetail.totalWastageArea.toFixed(2)} sqm]`,
    qty: round2(fabricDetail.totalBilledArea),
    unit: 'sqm',
    dealerRate: fabPrice.dealer, tierRate: p(fabPrice, tier),
    dealerAmount: round2(fabricDetail.totalBilledArea * fabPrice.dealer),
    tierAmount:   round2(fabricDetail.totalBilledArea * p(fabPrice, tier)),
  })

  if (item.withPrinting) {
    lineItems.push({
      description: 'Printing Charges',
      qty: round2(areaM2), unit: 'sqm',
      dealerRate: PRINTING.dealer, tierRate: p(PRINTING, tier),
      dealerAmount: round2(areaM2 * PRINTING.dealer),
      tierAmount:   round2(areaM2 * p(PRINTING, tier)),
    })
  }

  if (item.withFleece) {
    lineItems.push({
      description: 'Felt Pad / Fleece',
      qty: round2(areaM2), unit: 'sqm',
      dealerRate: FLEECE.dealer, tierRate: p(FLEECE, tier),
      dealerAmount: round2(areaM2 * FLEECE.dealer),
      tierAmount:   round2(areaM2 * p(FLEECE, tier)),
    })
  }

  // Gripper — each panel (fabric box) needs its own perimeter
  let gripQty: number
  let gripDesc: string
  if (fabricDetail.hasJoint && fabricDetail.panels.length > 1) {
    // Sum perimeters of all physical panels: 2*(physicalWidth + cutLength) per panel
    gripQty = round2(
      fabricDetail.panels.reduce((s, p) => s + 2 * (p.physicalWidth + p.cutLength), 0)
    )
    const panelDescs = fabricDetail.panels.map((p, i) =>
      `P${i+1}: 2×(${p.physicalWidth.toFixed(2)}+${p.cutLength.toFixed(2)})m`
    ).join(', ')
    gripDesc = `${item.gripperType} Gripper (${panelDescs})`
  } else {
    gripQty = Math.ceil(perimeterM * 10) / 10
    gripDesc = `${item.gripperType} Gripper`
  }
  const gripPrice = GRIPPER[item.gripperType] ?? GRIPPER['CW']
  lineItems.push({
    description: gripDesc,
    qty: round2(gripQty), unit: 'rmt',
    dealerRate: gripPrice.dealer, tierRate: p(gripPrice, tier),
    dealerAmount: round2(gripQty * gripPrice.dealer),
    tierAmount:   round2(gripQty * p(gripPrice, tier)),
  })

  // LED
  let ledDetail: LEDDetail | null = null
  if (item.lightType !== 'none') {
    // Strips are counted across the SHORTER dimension, run along the LONGER dimension.
    // This is correct regardless of how the fabric is oriented.
    const ledShortM = Math.min(geo.dim1M, geo.dim2M)
    const ledLongM  = Math.max(geo.dim1M, geo.dim2M)
    const spacingMM = item.ledSpacingMM ?? 125   // default 125mm gap between strips
    const stripSpacingInches = round2(spacingMM / 25.4)
    // strips = ceil(shorter_dim / spacing) + 1  (one extra, matches Pongs practice)
    const stripCount = Math.ceil((ledShortM * 1000) / spacingMM) + 1
    // Each strip runs the full long dimension, rounded UP to nearest 1m LED module
    const runningLengthM = Math.ceil(ledLongM * 1000 / 1000)  // = ceil(mm/1000) metres
    const totalRunningMeters = round2(stripCount * runningLengthM)
    const totalWatts = round2(totalRunningMeters * LED_WATTS_PER_M)
    ledDetail = { stripCount, runningLengthM, totalRunningMeters, totalWatts, stripSpacingInches }

    const lKey = ledKey(item)
    const ledPrice = LED[lKey]
    lineItems.push({
      description: `LED ${lKey} [${stripCount} strips × ${runningLengthM.toFixed(2)}m · ${LED_WATTS_PER_M}W/m = ${totalWatts}W total]`,
      qty: totalRunningMeters, unit: 'mtr',
      dealerRate: ledPrice.dealer, tierRate: p(ledPrice, tier),
      dealerAmount: round2(totalRunningMeters * ledPrice.dealer),
      tierAmount:   round2(totalRunningMeters * p(ledPrice, tier)),
    })

    lineItems.push(...buildDriverLines(totalRunningMeters, item.lightType, tier, item.daliDriver))
  }

  const subtotalDealer = lineItems.reduce((s, l) => s + l.dealerAmount, 0)
  const subtotalTier   = lineItems.reduce((s, l) => s + l.tierAmount,   0)

  const rate = installRate ?? INSTALLATION_RATE_PER_SQFT
  const installationCost = round2(areaM2 * SQFT_PER_SQM * rate * item.quantity)
  const subtotalFinal = round2(subtotalTier * item.quantity)

  return {
    item,
    dim1M: geo.dim1M,
    dim2M: geo.dim2M,
    widthM,
    lengthM,
    areaM2,
    areaM2Used: areaM2,
    perimeterM,
    fabricDetail,
    ledDetail,
    lineItems,
    installationCost,
    subtotalDealer: round2(subtotalDealer * item.quantity),
    subtotalTier:   round2(subtotalTier   * item.quantity),
    subtotalFinal,
    itemTotal: round2(subtotalFinal + installationCost),
  }
}

export function calculateQuote(quote: Quote): QuoteBreakdown {
  const tier = quote.priceTier
  const rate = quote.installationRatePerSqft ?? INSTALLATION_RATE_PER_SQFT
  const itemBreakdowns = quote.items.map(item => calculateItem(item, tier, rate))

  const materialsTotalDealer = round2(itemBreakdowns.reduce((s, b) => s + b.subtotalDealer, 0))
  const materialsTotalTier   = round2(itemBreakdowns.reduce((s, b) => s + b.subtotalTier,   0))
  const markupFactor = 1 + (quote.markupPercent ?? 0) / 100
  const materialsTotalFinal  = round2(materialsTotalTier * markupFactor)
  const totalInstallation    = round2(itemBreakdowns.reduce((s, b) => s + b.installationCost, 0))
  const transportCost        = quote.transportCost ?? 0
  const subtotalBeforeGst    = round2(materialsTotalFinal + totalInstallation + transportCost)
  const gstAmount            = quote.includeGst ? round2(subtotalBeforeGst * 0.18) : 0
  const grandTotal           = round2(subtotalBeforeGst + gstAmount)

  const totalSqft = round2(
    itemBreakdowns.reduce((s, b) => s + b.areaM2 * SQFT_PER_SQM * b.item.quantity, 0)
  )
  const pricePerSqft = totalSqft > 0 ? round2(grandTotal / totalSqft) : 0

  return {
    quote,
    itemBreakdowns,
    materialsTotalDealer,
    materialsTotalTier,
    materialsTotalFinal,
    totalInstallation,
    transportCost,
    subtotalBeforeGst,
    gstAmount,
    grandTotal,
    totalSqft,
    pricePerSqft,
  }
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100
}

// Round up to nearest 0.5m — used for billing cut lengths and gripper perimeter
function roundUpHalf(m: number): number {
  return Math.ceil(m * 2) / 2
}

export function fmtINR(n: number): string {
  return '₹' + Math.round(n).toLocaleString('en-IN')
}

export function formatDims(item: CeilingItem): string {
  const u = item.unit === 'feet' ? 'ft' : item.unit === 'mm' ? 'mm' : 'm'
  switch (item.shape) {
    case 'rectangle': {
      const { dim1, dim2 } = readTwoDims(item.dimensions)
      return `${dim1} × ${dim2} ${u}`
    }
    case 'circle': {
      const d = item.dimensions as CircleDims
      return `Ø${d.diameter} ${u}`
    }
    case 'triangle': {
      const raw = item.dimensions as unknown as Record<string, number>
      const d1 = raw.dim1 ?? raw.base ?? 0
      const d2 = raw.dim2 ?? raw.height ?? 0
      return `${d1} × ${d2} ${u} (triangle)`
    }
    case 'l-shape': {
      const d = item.dimensions as unknown as Record<string, number>
      return `L-Shape ${d.length1 ?? d.dim1 ?? 0}×${d.width1 ?? d.dim2 ?? 0} + ${d.length2 ?? 0}×${d.width2 ?? 0} ${u}`
    }
  }
}
