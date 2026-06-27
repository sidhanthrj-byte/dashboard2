import type { PriceTier } from './types'

export interface Price {
  dealer: number
  msp: number
  specifiors: number
}

export const FABRIC: Record<string, Price> = {
  'Descor Premium':              { dealer: 1100, msp: 1300, specifiors: 1200 },
  'Descor Premium Acoustic':     { dealer: 1815, msp: 2265, specifiors: 2015 },
  'Descor Translucent':          { dealer: 2035, msp: 2800, specifiors: 2400 },
  'Soundscape Directex':         { dealer: 1850, msp: 3000, specifiors: 2500 },
  'Silencio 10':                 { dealer: 1950, msp: 2500, specifiors: 2300 },
  'Silencio 5':                  { dealer: 1950, msp: 2500, specifiors: 2300 },
  'Akustico Weiss':              { dealer: 1800, msp: 2300, specifiors: 2200 },
  'Descor Premium Dry & Clean':  { dealer: 1650, msp: 2100, specifiors: 1850 },
  'Diffuser':                    { dealer: 800,  msp: 1200, specifiors: 1000 },
}

export const PRINTING: Price = { dealer: 1415, msp: 2400, specifiors: 1850 }

export const GRIPPER: Record<string, Price> = {
  'CW':          { dealer: 170, msp: 320, specifiors: 280 },
  'CC':          { dealer: 190, msp: 340, specifiors: 300 },
  'Profile':     { dealer: 135, msp: 320, specifiors: 280 },
  'Flexible CW': { dealer: 230, msp: 510, specifiors: 480 },
  'Flexible CC': { dealer: 300, msp: 530, specifiors: 500 },
}

export const LED: Record<string, Price> = {
  'Single Colour':       { dealer: 170, msp: 270, specifiors: 220 },
  'Tunable':             { dealer: 270, msp: 370, specifiors: 320 },
  'RGB':                 { dealer: 220, msp: 320, specifiors: 270 },
  'RGBW/NW/WW':          { dealer: 270, msp: 370, specifiors: 345 },
  'Wider Single Colour': { dealer: 220, msp: 320, specifiors: 270 },
  'Wider Tunable':       { dealer: 370, msp: 470, specifiors: 425 },
}

// 1 LED module = 1000mm = 13W (tunable: 16 dots, single colour: 10 dots)
export const LED_WATTS_PER_M = 13

export const INSTALLATION_RATE_PER_SQFT = 120  // ₹ per sqft
export const SQFT_PER_SQM = 10.7639

export interface DriverSpec { watts: number; price: Price }

// Standard drivers used for tunable white, standard dimmable, and single colour
export const STANDARD_DRIVERS: Record<string, DriverSpec> = {
  '200W': { watts: 200, price: { dealer: 1900, msp: 2500, specifiors: 2000 } },
  '450W': { watts: 450, price: { dealer: 3200, msp: 4500, specifiors: 3800 } }, // confirm price
  '600W': { watts: 600, price: { dealer: 4700, msp: 5500, specifiors: 5000 } },
}

export const DALI2_DRIVE_200W: DriverSpec = {
  watts: 200,
  price: { dealer: 5600, msp: 6100, specifiors: 5900 },
}

export const DT8_150W: DriverSpec = {
  watts: 150,
  price: { dealer: 5600, msp: 6100, specifiors: 5900 },
}

export const XLG_200I: DriverSpec = {
  watts: 200,
  price: { dealer: 3150, msp: 3750, specifiors: 3350 },
}

export const CONTROLS: Record<string, Price> = {
  // DALI controller (1 per 3 DALI drivers)
  'DA4m':                { dealer: 1800, msp: 2300, specifiors: 2100 },
  // Single Colour system
  'EV1 Power Repeater':  { dealer: 1700, msp: 2000, specifiors: 1900 },
  'V1 Controller':       { dealer: 1300, msp: 1600, specifiors: 1500 },
  'RT1 Remote':          { dealer: 1600, msp: 2000, specifiors: 1800 },
  // Standard Tunable / Standard Dimmable system
  'EV2 Power Repeater':  { dealer: 1800, msp: 2100, specifiors: 2000 },
  'V2 Controller':       { dealer: 1500, msp: 1900, specifiors: 1700 },
  'RT2 Remote':          { dealer: 1700, msp: 2100, specifiors: 1900 },
}

export const FLEECE: Price = { dealer: 500, msp: 1000, specifiors: 700 }

export const ROLL_WIDTHS = [2, 3, 4, 5] // metres, ascending

export function p(price: Price, tier: PriceTier): number {
  return price[tier]
}
