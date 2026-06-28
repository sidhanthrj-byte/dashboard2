export type PriceTier = 'dealer' | 'msp' | 'specifiors' | 'manual'

export interface ManualRates {
  fabricPerSqm: number
  ledPerMtr: number
  gripperPerRmt: number
  otherItemsTier: 'dealer' | 'msp' | 'specifiors'
}
export type ShapeType = 'rectangle' | 'circle' | 'triangle' | 'l-shape'
export type UnitSystem = 'mm' | 'feet' | 'meters'
export type LightType = 'none' | 'single_color' | 'single_color_dimmable' | 'tunable' | 'tunable_dali' | 'rgb' | 'rgbw'
export type GripperType = 'CW' | 'CC' | 'Profile' | 'Flexible CW' | 'Flexible CC'
export type LEDWidth = 'standard' | 'wider'
export type SurfaceType = 'ceiling' | 'wall'
export type JointType = 'none' | 'center' | 'off-center'
export type QuoteDisplayMode = 'total' | 'per-sqft'

export interface TwoDims { dim1: number; dim2: number }
export interface CircleDims { diameter: number }
export interface TriangleDims { dim1: number; dim2: number; side1: number; side2: number; side3: number }

export type ShapeDimensions = TwoDims | CircleDims | TriangleDims

export interface CeilingItem {
  id: string
  name: string
  surface: SurfaceType
  shape: ShapeType
  unit: UnitSystem
  dimensions: ShapeDimensions
  fabricType: string
  withPrinting: boolean
  withFleece: boolean
  lightType: LightType
  lightDepth: number
  ledWidth: LEDWidth
  gripperType: GripperType
  quantity: number
  jointType: JointType
  jointPosition: number
  ledSpacingMM: number  // strip-to-strip gap in mm; default 125 (150 for single colour)
  ledModuleType: 'standard' | '12dot'  // single colour only; 12dot = 12-dot/m module
  daliDriver: 'dt8' | 'da4m'  // DALI tunable only: which driver type
  driverOverrides: Record<string, number>  // qty overrides for driver/control line items (can increase or decrease)
  preferredDriverWatt?: '200W' | '450W' | '600W'  // force a single driver size instead of auto-mix
  marginMM?: number  // fabric margin per side in mm (smart: moved to cut axis if it would cause roll-width jump)
  printingRatePerSqm?: number  // override standard printing rate
  notes: string
}

export interface Quote {
  id: string
  quoteNumber: string
  clientName: string
  clientEmail: string
  clientPhone: string
  projectName: string
  location: string
  date: string
  validUntil: string
  priceTier: PriceTier
  markupPercent: number
  items: CeilingItem[]
  installationRatePerSqft: number
  transportCost: number
  includeGst: boolean
  displayMode: QuoteDisplayMode
  manualRates?: ManualRates
  notes: string
  createdAt: string
  updatedAt: string
}

export interface LineItem {
  description: string
  qty: number
  unit: string
  dealerRate: number
  tierRate: number
  dealerAmount: number
  tierAmount: number
}

export interface FabricPanel {
  rollWidth: number
  physicalWidth: number  // actual piece width (≤ rollWidth); cutLength is the other physical dim
  cutLength: number
  panelArea: number
  usedArea: number
  wastageArea: number
  wastagePercent: number
  orientation: string
  isJoint: boolean
}

export interface FabricDetail {
  panels: FabricPanel[]
  totalBilledArea: number
  totalUsedArea: number
  totalWastageArea: number
  hasJoint: boolean
  jointPosition: string
  // legacy compat
  rollWidth?: number
  cutLength?: number
  totalArea?: number
  usedArea?: number
  wastageArea?: number
  wastagePercent?: number
  orientation?: string
}

export interface LEDDetail {
  stripCount: number
  runningLengthM: number
  totalRunningMeters: number
  totalWatts: number
  stripSpacingInches: number
}

export interface ItemBreakdown {
  item: CeilingItem
  dim1M: number
  dim2M: number
  widthM: number
  lengthM: number
  areaM2: number
  areaM2Used: number
  perimeterM: number
  fabricDetail: FabricDetail
  ledDetail: LEDDetail | null
  lineItems: LineItem[]
  installationCost: number
  subtotalDealer: number
  subtotalTier: number
  subtotalFinal: number
  itemTotal: number
}

export interface QuoteBreakdown {
  quote: Quote
  itemBreakdowns: ItemBreakdown[]
  materialsTotalDealer: number
  materialsTotalTier: number
  materialsTotalFinal: number
  totalInstallation: number
  transportCost: number
  subtotalBeforeGst: number
  gstAmount: number
  grandTotal: number
  totalSqft: number
  pricePerSqft: number
}
