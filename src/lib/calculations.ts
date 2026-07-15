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

// ─── Auto Best Mix ───────────────────────────────────────────────────────────
// Preferred driver is 200W. 600W drivers run hot, need active (fan) cooling and
// are noisy, so the auto algorithm NEVER selects them — a combination of 200W
// drivers can always cover any load. Manual mode still allows 600W and the
// user's choice is always respected.
const AUTO_DRIVER_POOL = Object.entries(STANDARD_DRIVERS)
  .filter(([name]) => name !== '600W')
  .sort((a, b) => a[1].watts - b[1].watts)

/** Returns { driverName: count } covering `requiredWatts` (already incl. headroom). */
export function autoDriverMix(requiredWatts: number): Record<string, number> {
  const mix: Record<string, number> = {}
  if (requiredWatts <= 0) return mix
  // Single driver that fits (smallest sufficient, up to 400W) wins on driver count
  const single = AUTO_DRIVER_POOL.find(([, s]) => s.watts >= requiredWatts)
  if (single) return { [single[0]]: 1 }
  // Otherwise: fill with 200W drivers, then one smaller driver for the remainder
  const w200 = STANDARD_DRIVERS['200W'].watts
  const full = Math.floor(requiredWatts / w200)
  mix['200W'] = full
  const rem = requiredWatts - full * w200
  if (rem > 0) {
    const fit = AUTO_DRIVER_POOL.find(([, s]) => s.watts >= rem)!
    mix[fit[0]] = (mix[fit[0]] ?? 0) + 1
  }
  return mix
}

export function mixCapacity(mix: Record<string, number>): number {
  return Object.entries(mix).reduce(
    (s, [name, qty]) => s + (STANDARD_DRIVERS[name]?.watts ?? 0) * qty, 0)
}

function driverMixLines(mix: Record<string, number>, tier: PriceTier, suffix = ''): LineItem[] {
  return Object.entries(mix)
    .filter(([, qty]) => qty > 0)
    .map(([name, qty]) => {
      const spec = STANDARD_DRIVERS[name]
      return {
        description: `${name} Driver${suffix}`,
        qty, unit: 'nos',
        dealerRate: spec.price.dealer, tierRate: p(spec.price, tier),
        dealerAmount: qty * spec.price.dealer, tierAmount: qty * p(spec.price, tier),
      }
    })
}

interface DriverOptions {
  /** Manual driver counts (whole item). When set, overrides Auto Best Mix. */
  manualMix?: Record<string, number> | null
}

function buildDriverLines(
  totalWatts: number,
  lightType: string,
  tier: PriceTier,
  runningMeters: number,
  opts: DriverOptions = {},
): LineItem[] {
  const items: LineItem[] = []
  const required = totalWatts * 1.2

  if (lightType === 'tunable_dali') {
    // DALI at site: DT8 150W + DA4m
    const count = Math.ceil(required / DT8_150W.watts)
    items.push({
      description: 'DT8 150W Driver (DALI at site)',
      qty: count, unit: 'nos',
      dealerRate: DT8_150W.price.dealer,
      tierRate: p(DT8_150W.price, tier),
      dealerAmount: count * DT8_150W.price.dealer,
      tierAmount: count * p(DT8_150W.price, tier),
    })
    const da4m = CONTROLS['DA4m']
    items.push({
      description: 'DA4m DALI Controller',
      qty: count, unit: 'nos',
      dealerRate: da4m.dealer, tierRate: p(da4m, tier),
      dealerAmount: count * da4m.dealer, tierAmount: count * p(da4m, tier),
    })
    items.push(...controlAndRemote('tunable', tier))
  } else if (lightType === 'tunable') {
    // Standard tunable: standard drivers + Power Repeater SC + Controller Tunable
    const mix = opts.manualMix && Object.values(opts.manualMix).some(v => v > 0)
      ? opts.manualMix
      : autoDriverMix(required)
    items.push(...driverMixLines(mix, tier))
    // Power Repeater Single Colour for tunable (per spec)
    const rep = CONTROLS['Power Repeater Single Colour']
    items.push({
      description: 'Power Repeater Single Colour',
      qty: 1, unit: 'nos',
      dealerRate: rep.dealer, tierRate: p(rep, tier),
      dealerAmount: rep.dealer, tierAmount: p(rep, tier),
    })
    items.push(...controlAndRemote('tunable', tier))
  } else if (lightType === 'single_color_dimmable') {
    const count = Math.ceil(required / DALI2_DRIVE_200W.watts)
    items.push({
      description: 'DALI 2 Drive 200W (Dimmable)',
      qty: count, unit: 'nos',
      dealerRate: DALI2_DRIVE_200W.price.dealer,
      tierRate: p(DALI2_DRIVE_200W.price, tier),
      dealerAmount: count * DALI2_DRIVE_200W.price.dealer,
      tierAmount: count * p(DALI2_DRIVE_200W.price, tier),
    })
    const da4m = CONTROLS['DA4m']
    items.push({
      description: 'DA4m DALI Controller',
      qty: count, unit: 'nos',
      dealerRate: da4m.dealer, tierRate: p(da4m, tier),
      dealerAmount: count * da4m.dealer, tierAmount: count * p(da4m, tier),
    })
    items.push(...controlAndRemote('single', tier))
  } else {
    // Single colour / RGB / RGBW — standard CV drivers
    const mix = opts.manualMix && Object.values(opts.manualMix).some(v => v > 0)
      ? opts.manualMix
      : autoDriverMix(required)
    items.push(...driverMixLines(mix, tier))
    if (lightType === 'rgb' || lightType === 'rgbw') {
      items.push(...controlAndRemote('tunable', tier))
    } else if (lightType === 'single_color') {
      // Power repeater for long runs
      if (runningMeters > 20) {
        const rep = CONTROLS['Power Repeater Single Colour']
        items.push({
          description: 'Power Repeater Single Colour',
          qty: 1, unit: 'nos',
          dealerRate: rep.dealer, tierRate: p(rep, tier),
          dealerAmount: rep.dealer, tierAmount: p(rep, tier),
        })
      }
    }
  }

  return items
}

function controlAndRemote(type: 'single' | 'tunable', tier: PriceTier): LineItem[] {
  const ctrlKey = type === 'single' ? 'Controller Single Colour' : 'Controller Tunable/RGB'
  const remKey  = type === 'single' ? 'Remote Single Colour'     : 'Remote Tunable/RGB'
  const ctrl = CONTROLS[ctrlKey], rem = CONTROLS[remKey]
  return [
    {
      description: ctrlKey, qty: 1, unit: 'nos',
      dealerRate: ctrl.dealer, tierRate: p(ctrl, tier),
      dealerAmount: ctrl.dealer, tierAmount: p(ctrl, tier),
    },
    {
      description: remKey, qty: 1, unit: 'nos',
      dealerRate: rem.dealer, tierRate: p(rem, tier),
      dealerAmount: rem.dealer, tierAmount: p(rem, tier),
    },
  ]
}

export function calculateItem(item: CeilingItem, tier: PriceTier, installRate?: number): ItemBreakdown {
  const geo = getGeometry(item)
  const { widthM, lengthM, areaM2, perimeterM } = geo
  const lineItems: LineItem[] = []
  // All line items below carry TOTAL quantities (per piece × item quantity) so
  // the displayed qty, the costing, the PDF and any reports always agree.
  const qty = Math.max(1, item.quantity || 1)
  const qtySuffix = qty > 1 ? ` (×${qty} pcs)` : ''

  // Fabric — pass raw dimensions so computeFabricDetail can pick orientation by joint type
  const fabricDetail = computeFabricDetail(geo.dim1M, geo.dim2M, item)
  const fabPrice = FABRIC[item.fabricType] ?? FABRIC['Descor Premium']
  const fabricQty = round2(fabricDetail.totalBilledArea * qty)
  lineItems.push({
    description: `${item.fabricType} Fabric [${fabricDetail.panels[0]?.orientation ?? ''}, waste ${fabricDetail.totalWastageArea.toFixed(2)} sqm]${qtySuffix}`,
    qty: fabricQty,
    unit: 'sqm',
    dealerRate: fabPrice.dealer, tierRate: p(fabPrice, tier),
    dealerAmount: round2(fabricQty * fabPrice.dealer),
    tierAmount:   round2(fabricQty * p(fabPrice, tier)),
  })

  if (item.withPrinting) {
    const printQty = round2(areaM2 * qty)
    lineItems.push({
      description: `Printing Charges${qtySuffix}`,
      qty: printQty, unit: 'sqm',
      dealerRate: PRINTING.dealer, tierRate: p(PRINTING, tier),
      dealerAmount: round2(printQty * PRINTING.dealer),
      tierAmount:   round2(printQty * p(PRINTING, tier)),
    })
  }

  if (item.withFleece) {
    const fleeceQty = round2(areaM2 * qty)
    lineItems.push({
      description: `Felt Pad / Fleece${qtySuffix}`,
      qty: fleeceQty, unit: 'sqm',
      dealerRate: FLEECE.dealer, tierRate: p(FLEECE, tier),
      dealerAmount: round2(fleeceQty * FLEECE.dealer),
      tierAmount:   round2(fleeceQty * p(FLEECE, tier)),
    })
  }

  // Gripper — supplied only in 1-metre lengths, so the per-piece requirement is
  // ALWAYS rounded UP to the next whole metre (business rule, applies globally).
  let gripPerPiece = perimeterM
  // Add gripper for joint line if jointed
  if (fabricDetail.hasJoint) {
    gripPerPiece += widthM
  }
  const gripQty = Math.ceil(round2(gripPerPiece)) * qty
  const gripPrice = GRIPPER[item.gripperType] ?? GRIPPER['CW']
  lineItems.push({
    description: `${item.gripperType} Gripper${fabricDetail.hasJoint ? ' (incl. joint line)' : ''}${qtySuffix}`,
    qty: gripQty, unit: 'rmt',
    dealerRate: gripPrice.dealer, tierRate: p(gripPrice, tier),
    dealerAmount: round2(gripQty * gripPrice.dealer),
    tierAmount:   round2(gripQty * p(gripPrice, tier)),
  })

  // LED
  let ledDetail: LEDDetail | null = null
  let driverWarning: string | null = null
  if (item.lightType !== 'none') {
    const lightingConfig = item.lightingConfig ?? 'non-looped'
    const depthIn = item.lightDepth ?? 6
    const stripSpacingInches = depthIn  // spacing between strips = depth
    const spacingMM = depthIn * 25.4    // convert inches to mm
    // strips = ceil(width / spacing) + 1  (one extra for safety, matches Pongs practice)
    const widthMM = widthM * 1000
    const stripCount = Math.ceil(widthMM / spacingMM) + 1
    const runningLengthM = lengthM
    const perPieceRunningMeters = round2(stripCount * runningLengthM)
    const perPieceWatts = round2(perPieceRunningMeters * LED_WATTS_PER_M)
    const totalRunningMeters = round2(perPieceRunningMeters * qty)
    const totalWatts = round2(perPieceWatts * qty)
    ledDetail = {
      stripCount, runningLengthM, totalRunningMeters, totalWatts,
      stripSpacingInches, perPieceRunningMeters, perPieceWatts, lightingConfig,
    }

    const lKey = ledKey(item)
    const ledPrice = LED[lKey]
    lineItems.push({
      description: `LED ${lKey} [${stripCount} strips × ${runningLengthM.toFixed(2)}m · ${LED_WATTS_PER_M}W/m = ${totalWatts}W total]${qtySuffix}`,
      qty: totalRunningMeters, unit: 'mtr',
      dealerRate: ledPrice.dealer, tierRate: p(ledPrice, tier),
      dealerAmount: round2(totalRunningMeters * ledPrice.dealer),
      tierAmount:   round2(totalRunningMeters * p(ledPrice, tier)),
    })

    const manualMix = (item.driverMode ?? 'auto') === 'manual' ? item.manualDrivers ?? null : null

    if (lightingConfig === 'looped' || qty === 1 || manualMix) {
      // LOOPED (or single piece, or explicit manual selection): all pieces are one
      // continuous system — sum LED modules → total wattage → ONE driver selection.
      lineItems.push(...buildDriverLines(totalWatts, item.lightType, tier, totalRunningMeters, { manualMix }))
    } else {
      // NON-LOOPED (legacy): each piece is independent. Drivers are sized per piece
      // and every driver/controller line is multiplied by the quantity so displayed
      // quantities always match what is actually costed.
      const perPieceLines = buildDriverLines(perPieceWatts, item.lightType, tier, perPieceRunningMeters)
      lineItems.push(...perPieceLines.map(l => ({
        ...l,
        description: `${l.description}${qtySuffix}`,
        qty: l.qty * qty,
        dealerAmount: round2(l.dealerAmount * qty),
        tierAmount: round2(l.tierAmount * qty),
      })))
    }

    // Advisory warning: manual driver capacity vs Auto Best Mix capacity (>30% over).
    if (manualMix && Object.values(manualMix).some(v => v > 0)) {
      const manualCapacity = mixCapacity(manualMix)
      const required = totalWatts * 1.2
      const autoCapacity = lightingConfig === 'looped' || qty === 1
        ? mixCapacity(autoDriverMix(required))
        : mixCapacity(autoDriverMix(perPieceWatts * 1.2)) * qty
      if (autoCapacity > 0 && manualCapacity > autoCapacity * 1.3) {
        driverWarning =
          `Manual driver selection (${manualCapacity}W) exceeds the recommended automatic configuration ` +
          `(${autoCapacity}W) by more than 30%. This may increase project cost unnecessarily. ` +
          `Recommended configuration: Auto Best Mix.`
      }
    }
  }

  // Line items already include quantity — do NOT multiply again.
  const subtotalDealer = lineItems.reduce((s, l) => s + l.dealerAmount, 0)
  const subtotalTier   = lineItems.reduce((s, l) => s + l.tierAmount,   0)

  const rate = installRate ?? INSTALLATION_RATE_PER_SQFT
  const installationCost = round2(areaM2 * SQFT_PER_SQM * rate * qty)
  const subtotalFinal = round2(subtotalTier)

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
    driverWarning,
    subtotalDealer: round2(subtotalDealer),
    subtotalTier:   round2(subtotalTier),
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
