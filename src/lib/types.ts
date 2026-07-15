export type PriceTier = 'dealer' | 'msp' | 'specifiors'
export type ShapeType = 'rectangle' | 'circle' | 'triangle' | 'l-shape'
export type UnitSystem = 'mm' | 'feet' | 'meters'
export type LightType = 'none' | 'single_color' | 'single_color_dimmable' | 'tunable' | 'tunable_dali' | 'rgb' | 'rgbw'
export type GripperType = 'CW' | 'CC' | 'Profile' | 'Flexible CW' | 'Flexible CC'
export type LEDWidth = 'standard' | 'wider'
export type SurfaceType = 'ceiling' | 'wall'
export type JointType = 'none' | 'center' | 'off-center'
export type QuoteDisplayMode = 'total' | 'per-sqft'
// Looped = all pieces of a multi-quantity item wired as ONE continuous lighting
// system (drivers sized on combined wattage). Non-looped = each piece independent.
export type LightingConfig = 'non-looped' | 'looped'
export type DriverMode = 'auto' | 'manual'
export type UserRole = 'admin' | 'user'

export interface AppUser {
  id: string
  name: string
  email: string
  role: UserRole
  createdAt: string
}

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
  notes: string
  /** Looped vs non-looped lighting system (default non-looped = legacy behaviour) */
  lightingConfig?: LightingConfig
  /** Auto Best Mix (default) or manual driver selection */
  driverMode?: DriverMode
  /** Manual driver counts by driver name (e.g. { '200W': 2 }) — total for the whole item */
  manualDrivers?: Record<string, number>
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
  notes: string
  createdAt: string
  updatedAt: string
  /** Issuing company (STC / NLS). Older quotes have none → treated as STC. */
  company?: string
  /** Owner: user id + display name of the employee who created the quote */
  createdBy?: string | null
  createdByName?: string | null
  status?: string
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
  /** Running metres across ALL pieces (per-piece × quantity) */
  totalRunningMeters: number
  /** Wattage across ALL pieces — drivers/costing/UI/PDF all use this value */
  totalWatts: number
  stripSpacingInches: number
  /** Per-piece values, kept for display */
  perPieceRunningMeters: number
  perPieceWatts: number
  lightingConfig: LightingConfig
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
  /** Advisory (non-blocking) warning when manual driver capacity exceeds auto mix by >30% */
  driverWarning?: string | null
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
