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

function bestRollForWidth(widthM: number): number {
  const widthMM = widthM * 1000
  const rolls = ROLL_WIDTHS // metres: [2,3,4,5]
  const rollMM = rolls.map(r => r * 1000)
  const fit = rollMM.find(r => r >= widthMM)
  return fit ? fit / 1000 : 5 // default to 5m if too wide
}

function makePanel(
  widthM: number,
  lengthM: number,
  isJoint: boolean,
): FabricPanel {
  const roll = bestRollForWidth(widthM)
  const panelArea = round2(roll * lengthM)
  const usedArea = round2(widthM * lengthM)
  const wastageArea = round2(panelArea - usedArea)
  const wastagePercent = panelArea > 0 ? round2((wastageArea / panelArea) * 100) : 0
  return {
    rollWidth: roll,
    cutLength: round2(lengthM),
    panelArea,
    usedArea,
    wastageArea,
    wastagePercent,
    orientation: `${roll}m roll × ${lengthM.toFixed(2)}m cut`,
    isJoint,
  }
}

function computeFabricDetail(
  widthM: number,
  lengthM: number,
  item: CeilingItem,
): FabricDetail {
  const widthMM = widthM * 1000
  const lengthMM = lengthM * 1000
  const hasJoint = widthMM > 5000 || lengthMM > 5000
    ? item.jointType !== 'none'
    : false
  const bothOver5k = widthMM > 5000 && lengthMM > 5000

  let panels: FabricPanel[] = []
  let jointPositionDesc = ''

  if (!bothOver5k || item.jointType === 'none') {
    // Single panel — optimise orientation
    const dim1MM = widthM * 1000
    const dim2MM = lengthM * 1000
    // Try widthM as roll axis
    const roll1 = bestRollForWidth(widthM)
    const waste1 = (roll1 - widthM) * lengthM
    // Try lengthM as roll axis
    const roll2 = bestRollForWidth(lengthM)
    const waste2 = (roll2 - lengthM) * widthM

    let chosenWidth: number, chosenLength: number
    if (waste1 <= waste2) {
      chosenWidth = widthM; chosenLength = lengthM
    } else {
      chosenWidth = lengthM; chosenLength = widthM
    }
    panels = [makePanel(chosenWidth, chosenLength, false)]
    jointPositionDesc = 'No joint'
  } else if (item.jointType === 'center') {
    // Split lengthM (the longer dim) in half
    const half = lengthM / 2
    panels = [
      makePanel(widthM, half, true),
      makePanel(widthM, half, true),
    ]
    jointPositionDesc = `Center joint at ${(half * 1000).toFixed(0)}mm from each end`
  } else {
    // off-center
    const pos = (item.jointPosition ?? 0) / 1000 // mm → m
    const p1len = Math.max(0.01, pos)
    const p2len = Math.max(0.01, lengthM - p1len)
    panels = [
      makePanel(widthM, p1len, true),
      makePanel(widthM, p2len, true),
    ]
    jointPositionDesc = `Joint at ${item.jointPosition}mm from one end`
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
      // Smart orientation: try both as roll width, pick less wastage
      const roll1 = bestRollForWidth(d1M)
      const roll2 = bestRollForWidth(d2M)
      const waste1 = (roll1 - d1M) * d2M
      const waste2 = (roll2 - d2M) * d1M
      const widthM = waste1 <= waste2 ? d1M : d2M
      const lengthM = waste1 <= waste2 ? d2M : d1M
      return {
        dim1M: d1M, dim2M: d2M,
        widthM, lengthM,
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

function buildDriverLines(
  totalWatts: number,
  lightType: string,
  tier: PriceTier,
  runningMeters: number,
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
    const sorted = Object.entries(STANDARD_DRIVERS).sort((a, b) => a[1].watts - b[1].watts)
    const counts: Record<string, number> = {}
    let rem = required
    while (rem > 0) {
      const fit = sorted.find(([, s]) => s.watts >= rem)
      if (fit) { counts[fit[0]] = (counts[fit[0]] || 0) + 1; rem = 0 }
      else { const lg = sorted[sorted.length - 1]; counts[lg[0]] = (counts[lg[0]] || 0) + 1; rem -= lg[1].watts }
    }
    for (const [name, qty] of Object.entries(counts)) {
      const spec = STANDARD_DRIVERS[name]
      items.push({
        description: `${name} Driver`,
        qty, unit: 'nos',
        dealerRate: spec.price.dealer, tierRate: p(spec.price, tier),
        dealerAmount: qty * spec.price.dealer, tierAmount: qty * p(spec.price, tier),
      })
    }
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
    const sorted = Object.entries(STANDARD_DRIVERS).sort((a, b) => a[1].watts - b[1].watts)
    const counts: Record<string, number> = {}
    let rem = required
    while (rem > 0) {
      const fit = sorted.find(([, s]) => s.watts >= rem)
      if (fit) { counts[fit[0]] = (counts[fit[0]] || 0) + 1; rem = 0 }
      else { const lg = sorted[sorted.length - 1]; counts[lg[0]] = (counts[lg[0]] || 0) + 1; rem -= lg[1].watts }
    }
    for (const [name, qty] of Object.entries(counts)) {
      const spec = STANDARD_DRIVERS[name]
      items.push({
        description: `${name} Driver`,
        qty, unit: 'nos',
        dealerRate: spec.price.dealer, tierRate: p(spec.price, tier),
        dealerAmount: qty * spec.price.dealer, tierAmount: qty * p(spec.price, tier),
      })
    }
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

  // Fabric
  const fabricDetail = computeFabricDetail(widthM, lengthM, item)
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

  // Gripper
  let gripQty = Math.ceil(perimeterM * 10) / 10
  // Add gripper for joint line if jointed
  if (fabricDetail.hasJoint) {
    gripQty = round2(gripQty + widthM)
  }
  const gripPrice = GRIPPER[item.gripperType] ?? GRIPPER['CW']
  lineItems.push({
    description: `${item.gripperType} Gripper${fabricDetail.hasJoint ? ' (incl. joint line)' : ''}`,
    qty: round2(gripQty), unit: 'rmt',
    dealerRate: gripPrice.dealer, tierRate: p(gripPrice, tier),
    dealerAmount: round2(gripQty * gripPrice.dealer),
    tierAmount:   round2(gripQty * p(gripPrice, tier)),
  })

  // LED
  let ledDetail: LEDDetail | null = null
  if (item.lightType !== 'none') {
    const depthIn = item.lightDepth ?? 6
    const stripSpacingInches = depthIn  // spacing between strips = depth
    const spacingMM = depthIn * 25.4    // convert inches to mm
    // strips = ceil(width / spacing) + 1  (one extra for safety, matches Pongs practice)
    const widthMM = widthM * 1000
    const stripCount = Math.ceil(widthMM / spacingMM) + 1
    const runningLengthM = lengthM
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

    lineItems.push(...buildDriverLines(totalWatts, item.lightType, tier, totalRunningMeters))
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
