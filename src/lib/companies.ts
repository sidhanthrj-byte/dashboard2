// Centralized multi-company configuration.
// The quotation team issues quotes on behalf of multiple companies.
// All company identity/branding lives here — add a new company by adding
// an entry to COMPANIES; no component changes should be needed.

export type CompanyId = 'STC' | 'NLS'

export interface CompanyProfile {
  id: CompanyId
  /** Short display name used in filters/badges */
  name: string
  /** Full legal name printed on quotations */
  legalName: string
  /** Small tagline shown above the brand mark on the PDF header */
  tagline: string
  /** Product brand mark shown large on the PDF */
  brand: string
  brandSub: string
  address: string
  city: string
  email: string
  phone: string
  website?: string
  gst?: string
  bankDetails?: string
  /** Accent styling hooks for badges */
  badgeClass: string
}

export const COMPANIES: Record<CompanyId, CompanyProfile> = {
  STC: {
    id: 'STC',
    name: 'STC',
    legalName: 'Sidharth Trading Co.',
    tagline: 'Sidharth Trading Co.',
    brand: 'PONGS',
    brandSub: 'STRETCH CEILING SYSTEMS',
    address: 'Bengaluru, Karnataka',
    city: 'Bengaluru',
    email: 'info@pongsindia.com',
    phone: '',
    website: '',
    gst: '',
    bankDetails: '',
    badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
  },
  NLS: {
    id: 'NLS',
    name: 'NLS',
    legalName: 'Next Level Solutions',
    tagline: 'Next Level Solutions',
    brand: 'PONGS',
    brandSub: 'STRETCH CEILING SYSTEMS',
    address: 'Bengaluru, Karnataka',
    city: 'Bengaluru',
    email: 'info@pongsindia.com',
    phone: '',
    website: '',
    gst: '',
    bankDetails: '',
    badgeClass: 'bg-sky-50 text-sky-700 border border-sky-100',
  },
}

export const COMPANY_IDS = Object.keys(COMPANIES) as CompanyId[]
export const DEFAULT_COMPANY: CompanyId = 'STC'

/** Backwards-compatible lookup: quotes created before this feature have no company → STC. */
export function getCompany(id?: string | null): CompanyProfile {
  return COMPANIES[(id as CompanyId) ?? DEFAULT_COMPANY] ?? COMPANIES[DEFAULT_COMPANY]
}
