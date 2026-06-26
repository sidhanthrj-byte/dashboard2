import type {
  CeilingItem, PriceTier, FabricDetail, LEDDetail,
  LineItem, ItemBreakdown, QuoteBreakdown, Quote,
  RectDims, CircleDims, TriangleDims, LShaperDims,
} from './types'
import {
  FABRIC, PRINTING, GRIPPER, LED, LED_WATTS_PER_M,
  STANDARD_DRIVERS, DALI2_DRIVE_200W, DT8_150W,
  CONTROLS, FLEECE, ROLL_WIDTHS, p,
  INSTALLATION_RATE_PER_SQFT, SQFT_PER_SQM,
} from './pricing'

const FT = 0.3048  // feet to metres

export function toM(v: number, unit: 'feet' | 'meters'): number {
  return unit === 'feet' ? v * FT : v
}

function getGeometry(item: CeilingItem) {
  const u = item.unit
  switch (item.shape) {
    case 'rectangle': {
      const d = item.dimensions as RectDims
      const L = toM(d.length, u), W = toM(d.width, u)
      return { lengthM: L, widthM: W, areaM2: L * W, perimeterM: 2 * (L + W) }
    }
    case 'circle': {
      const d = item.dimensions as CircleDims
      const D = toM(d.diameter, u)
      // Bounding square = diameter × diameter; perimeter = π × D for gripper
      return { lengthM: D, widthM: D, areaM2: D * D, perimeterM: Math.PI * D }
    }
    case 'triangle': {
      const d = item.dimensions as TriangleDims
      const b = toM(d.base, u), h = toM(d.height, u)
      const s1 = toM(d.side1, u), s2 = toM(d.side2, u), s3 = toM(d.side3, u)
      // Use bounding rectangle (base × height) for fabric; actual perimeter for gripper
      return { lengthM: b, widthM: h, areaM2: 0.5 * b * h, perimeterM: s1 + s2 + s3 }
    }
    case 'l-shape': {
      const d = item.dimensions as LShaperDims
      const L1 = toM(d.length1, u), W1 = toM(d.width1, u)
      const L2 = toM(d.length2, u), W2 = toM(d.width2, u)
      // L-shape area = sum of two rectangles; bounding box = (L1+L2) × max(W1,W2) for fabric
      const totalLength = L1 + L2
      const maxWidth = Math.max(W1, W2)
      const area = L1 * W1 + L2 * W2
      // Perimeter of L-shape (6 sides)
      const perim = 2 * (L1 + W1 + L2 + W2) - 2 * Math.min(W1, W2) // approximation
      return { lengthM: totalLength, widthM: maxWidth, areaM2: area, perimeterM: perim }
    }
  }
}

function bestRoll(lengthM: number, widthM: number): FabricDetail {
  let best: FabricDetail | null = null

  function tryOrientation(rollAlong: 'width' | 'length') {
    const [runAcross, runAlong] = rollAlong === 'width'
      ? [widthM, lengthM]
      : [lengthM, widthM]

    // Find smallest roll that fits across dimension
    const roll = ROLL_WIDTHS.find(r => r >= runAcross)
    if (!roll) return   // dimension > 5m, handled separately

    const totalArea = roll * runAlong
    const usedArea = runAcross * runAlong
    const wastage = (roll - runAcross) * runAlong

    if (!best || wastage < best.wastageArea) {
      best = {
        rollWidth: roll,
        cutLength: runAlong,
        totalArea,
        usedArea,
        wastageArea: wastage,
        wastagePercent: (wastage / totalArea) * 100,
        orientation: `${roll}m roll × ${runAlong.toFixed(2)}m cut`,
      }
    }
  }

  tryOrientation('width')
  tryOrientation('length')

  if (!best) {
    // Both dims > 5m — use multiple 5m strips
    const [longer, shorter] = lengthM >= widthM
      ? [lengthM, widthM]
      : [widthM, lengthM]
    const strips = Math.ceil(shorter / 5)
    const totalArea = 5 * strips * longer
    const wastage = (5 * strips - shorter) * longer
    best = {
      rollWidth: 5,
      cutLength: longer,
      totalArea,
      usedArea: shorter * longer,
      wastageArea: wastage,
      wastagePercent: (wastage / totalArea) * 100,
      orientation: `${strips}× 5m strips × ${longer.toFixed(2)}m`,
    }
  }

  return best
}

function ledKey(item: CeilingItem): string {
  if (item.lightType === 'tunable') return item.ledWidth === 'wider' ? 'Wider Tunable' : 'Tunable'
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
  const required = totalWatts * 1.2  // 20% headroom

  if (lightType === 'tunable') {
    // DT8 150W drivers for DALI DT8 tunable white
    const count = Math.ceil(required / DT8_150W.watts)
    items.push({
      description: 'DT8 150W Driver (Tunable DALI)',
      qty: count, unit: 'nos',
      dealerRate: DT8_150W.price.dealer,
      tierRate: p(DT8_150W.price, tier),
      dealerAmount: count * DT8_150W.price.dealer,
      tierAmount: count * p(DT8_150W.price, tier),
    })
    // One DA4m per DT8 driver
    const da4m = CONTROLS['DA4m']
    items.push({
      description: 'DA4m DALI Controller',
      qty: count, unit: 'nos',
      dealerRate: da4m.dealer, tierRate: p(da4m, tier),
      dealerAmount: count * da4m.dealer, tierAmount: count * p(da4m, tier),
    })
    items.push(...controlAndRemote('tunable', tier))
  } else if (lightType === 'single_color_dimmable') {
    // DALI 2 Drive 200W for dimmable single colour
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
    // Standard constant-voltage drivers (single color non-dimmable, RGB, RGBW)
    const sorted = Object.entries(STANDARD_DRIVERS).sort((a, b) => a[1].watts - b[1].watts)
    const counts: Record<string, number> = {}
    let rem = required
    while (rem > 0) {
      const fit = sorted.find(([, s]) => s.watts >= rem)
      if (fit) {
        counts[fit[0]] = (counts[fit[0]] || 0) + 1
        rem = 0
      } else {
        const largest = sorted[sorted.length - 1]
        counts[largest[0]] = (counts[largest[0]] || 0) + 1
        rem -= largest[1].watts
      }
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
    }
  }

  // Power repeater for long runs (> 20m)
  if (runningMeters > 20) {
    const repKey = lightType === 'single_color' || lightType === 'single_color_dimmable'
      ? 'Power Repeater Single Colour'
      : 'Power Repeater Tunable/RGB'
    const rep = CONTROLS[repKey]
    items.push({
      description: repKey,
      qty: 1, unit: 'nos',
      dealerRate: rep.dealer, tierRate: p(rep, tier),
      dealerAmount: rep.dealer, tierAmount: p(rep, tier),
    })
  }

  return items
}

function controlAndRemote(type: 'single' | 'tunable', tier: PriceTier): LineItem[] {
  const ctrlKey = type === 'single' ? 'Controller Single Colour' : 'Controller Tunable/RGB'
  const remKey  = type === 'single' ? 'Remote Single Colour'     : 'Remote Tunable/RGB'
  const ctrl = CONTROLS[ctrlKey], rem = CONTROLS[remKey]
  return [
    {
      description: ctrlKey,
      qty: 1, unit: 'nos',
      dealerRate: ctrl.dealer, tierRate: p(ctrl, tier),
      dealerAmount: ctrl.dealer, tierAmount: p(ctrl, tier),
    },
    {
      description: remKey,
      qty: 1, unit: 'nos',
      dealerRate: rem.dealer, tierRate: p(rem, tier),
      dealerAmount: rem.dealer, tierAmount: p(rem, tier),
    },
  ]
}

export function calculateItem(item: CeilingItem, tier: PriceTier): ItemBreakdown {
  const geo = getGeometry(item)
  const { lengthM, widthM, areaM2, perimeterM } = geo
  const lineItems: LineItem[] = []

  // ─── Fabric ────────────────────────────────────────────────────────────────
  const fabricDetail = bestRoll(lengthM, widthM)
  const fabPrice = FABRIC[item.fabricType] ?? FABRIC['Descor Premium']
  lineItems.push({
    description: `${item.fabricType} Fabric  [${fabricDetail.orientation}, waste ${fabricDetail.wastageArea.toFixed(2)} sqm]`,
    qty: round2(fabricDetail.totalArea),
    unit: 'sqm',
    dealerRate: fabPrice.dealer, tierRate: p(fabPrice, tier),
    dealerAmount: round2(fabricDetail.totalArea * fabPrice.dealer),
    tierAmount:   round2(fabricDetail.totalArea * p(fabPrice, tier)),
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

  // ─── Gripper ───────────────────────────────────────────────────────────────
  const gripQty = Math.ceil(perimeterM * 10) / 10   // round up to 0.1m
  const gripPrice = GRIPPER[item.gripperType] ?? GRIPPER['CW']
  lineItems.push({
    description: `${item.gripperType} Gripper`,
    qty: round2(gripQty), unit: 'rmt',
    dealerRate: gripPrice.dealer, tierRate: p(gripPrice, tier),
    dealerAmount: round2(gripQty * gripPrice.dealer),
    tierAmount:   round2(gripQty * p(gripPrice, tier)),
  })

  // ─── LED & Drivers ─────────────────────────────────────────────────────────
  let ledDetail: LEDDetail | null = null

  if (item.lightType !== 'none') {
    const depthIn = item.lightDepth ?? 6
    const stripCount = Math.max(1, Math.floor(depthIn / 6))
    const runningLength = Math.max(lengthM, widthM)   // strips run along longer side
    const totalRunningMeters = round2(stripCount * runningLength)
    const lKey = ledKey(item)
    const totalWatts = round2(totalRunningMeters * LED_WATTS_PER_M)  // 12W per metre

    ledDetail = { stripCount, runningLength, totalRunningMeters, totalWatts }

    const ledPrice = LED[lKey]
    lineItems.push({
      description: `LED ${lKey}  [${stripCount} strip${stripCount > 1 ? 's' : ''} × ${runningLength.toFixed(2)}m · 12W/m = ${totalWatts}W]`,
      qty: totalRunningMeters, unit: 'mtr',
      dealerRate: ledPrice.dealer, tierRate: p(ledPrice, tier),
      dealerAmount: round2(totalRunningMeters * ledPrice.dealer),
      tierAmount:   round2(totalRunningMeters * p(ledPrice, tier)),
    })

    lineItems.push(...buildDriverLines(totalWatts, item.lightType, tier, totalRunningMeters))
  }

  // ─── Totals per item ───────────────────────────────────────────────────────
  const subtotalDealer = lineItems.reduce((s, l) => s + l.dealerAmount, 0)
  const subtotalTier   = lineItems.reduce((s, l) => s + l.tierAmount,   0)

  // ─── Installation: ₹60/sqft on actual ceiling area × quantity ──────────────
  const installationRate = INSTALLATION_RATE_PER_SQFT
  const areaM2Used = areaM2  // actual ceiling area (no wastage added for installation)
  const installationCost = round2(areaM2Used * SQFT_PER_SQM * installationRate * item.quantity)

  const subtotalFinal = round2(subtotalTier * item.quantity)

  return {
    item,
    ...geo,
    areaM2Used,
    fabricDetail,
    ledDetail,
    lineItems,
    installationCost,
    subtotalDealer:  round2(subtotalDealer * item.quantity),
    subtotalTier:    round2(subtotalTier   * item.quantity),
    subtotalFinal,
    itemTotal: round2(subtotalFinal + installationCost),
  }
}

export function calculateQuote(quote: Quote): QuoteBreakdown {
  const tier = quote.priceTier
  const rate = quote.installationRatePerSqft ?? INSTALLATION_RATE_PER_SQFT
  const itemBreakdowns = quote.items.map(item => {
    const bd = calculateItem(item, tier)
    // Recalculate installation if quote has a custom rate
    if (rate !== INSTALLATION_RATE_PER_SQFT) {
      const inst = round2(bd.areaM2Used * SQFT_PER_SQM * rate * item.quantity)
      return { ...bd, installationCost: inst, itemTotal: round2(bd.subtotalFinal + inst) }
    }
    return bd
  })

  const materialsTotalDealer = round2(itemBreakdowns.reduce((s, b) => s + b.subtotalDealer, 0))
  const materialsTotalTier   = round2(itemBreakdowns.reduce((s, b) => s + b.subtotalTier,   0))
  const markupFactor = 1 + (quote.markupPercent ?? 0) / 100
  const materialsTotalFinal  = round2(materialsTotalTier * markupFactor)
  const totalInstallation    = round2(itemBreakdowns.reduce((s, b) => s + b.installationCost, 0))
  const grandTotal           = round2(materialsTotalFinal + totalInstallation)

  return {
    quote,
    itemBreakdowns,
    materialsTotalDealer,
    materialsTotalTier,
    materialsTotalFinal,
    totalInstallation,
    grandTotal,
  }
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function fmtINR(n: number): string {
  return '₹' + Math.round(n).toLocaleString('en-IN')
}

export function formatDims(item: CeilingItem): string {
  const u = item.unit === 'feet' ? 'ft' : 'm'
  switch (item.shape) {
    case 'rectangle': {
      const d = item.dimensions as RectDims
      return `${d.length} × ${d.width} ${u}`
    }
    case 'circle': {
      const d = item.dimensions as CircleDims
      return `⌀${d.diameter} ${u}`
    }
    case 'triangle': {
      const d = item.dimensions as TriangleDims
      return `${d.base} × ${d.height} ${u} (triangle)`
    }
    case 'l-shape': {
      const d = item.dimensions as LShaperDims
      return `L-Shape ${d.length1}×${d.width1} + ${d.length2}×${d.width2} ${u}`
    }
  }
}
