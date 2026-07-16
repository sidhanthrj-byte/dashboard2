// Centralized multi-company registry.
// Adding a new company = add one entry here. Nothing else in the app hardcodes
// company identity — everything reads from this config (branding, address, GST,
// bank details, contact, footer) via getCompany().

export interface CompanyConfig {
  id: string           // stable key stored on the quote (e.g. 'STC')
  name: string         // full legal / display name
  shortName: string    // compact label for chips and filters
  tagline?: string
  logoText: string     // monogram used in the header badge
  address: string
  city: string
  email: string
  phone: string
  website: string
  gstin?: string
  bank?: {
    name: string
    accountName: string
    accountNumber: string
    ifsc: string
  }
  footer: string
  accent: string       // tailwind-ish hex accent for subtle per-company theming
}

export const COMPANIES: Record<string, CompanyConfig> = {
  STC: {
    id: 'STC',
    name: 'Stretch Ceiling Company',
    shortName: 'STC',
    tagline: 'Precision Stretch Ceilings',
    logoText: 'STC',
    address: 'No. 12, Industrial Layout, Koramangala',
    city: 'Bengaluru, Karnataka 560095',
    email: 'info@stretchceiling.in',
    phone: '+91 98450 00000',
    website: 'www.stretchceiling.in',
    gstin: '29ABCDE1234F1Z5',
    bank: {
      name: 'HDFC Bank',
      accountName: 'Stretch Ceiling Company',
      accountNumber: '50200012345678',
      ifsc: 'HDFC0001234',
    },
    footer: 'Stretch Ceiling Company · Bengaluru · info@stretchceiling.in',
    accent: '#047857',
  },
  NLS: {
    id: 'NLS',
    name: 'Next Level Solutions',
    shortName: 'NLS',
    tagline: 'Next Level Interior Solutions',
    logoText: 'NLS',
    address: 'No. 45, MG Road, Ashok Nagar',
    city: 'Bengaluru, Karnataka 560001',
    email: 'info@nextlevelsolutions.in',
    phone: '+91 98450 11111',
    website: 'www.nextlevelsolutions.in',
    gstin: '29XYZAB5678C1Z3',
    bank: {
      name: 'ICICI Bank',
      accountName: 'Next Level Solutions',
      accountNumber: '000401234567',
      ifsc: 'ICIC0000004',
    },
    footer: 'Next Level Solutions · Bengaluru · info@nextlevelsolutions.in',
    accent: '#0f766e',
  },
}

export const DEFAULT_COMPANY = 'STC'

export function getCompany(id: string | undefined | null): CompanyConfig {
  return COMPANIES[id ?? ''] ?? COMPANIES[DEFAULT_COMPANY]
}

export function listCompanies(): CompanyConfig[] {
  return Object.values(COMPANIES)
}
