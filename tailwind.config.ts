import type { Config } from 'tailwindcss'

/**
 * DESIGN SYSTEM — "Drafting Table"
 * ---------------------------------------------------------------------------
 * The product estimates physical space: fabric cut-lengths, gripper perimeters,
 * LED runs, driver loads. The interface is modelled on an architect's drawing
 * set — warm drafting paper, graphite hairline rules, a title block, figures in
 * an engineering monospace. Black is the drawing; a single redline vermillion is
 * the annotation, used only where attention is earned.
 *
 * Two rules for anyone extending this:
 *   1. Neutrals are warm paper/graphite — never a cool gray. gray/slate/zinc all
 *      resolve to the same `paper` ramp so nothing drifts cold.
 *   2. Colour means something. `accent` (redline) marks the one thing that
 *      matters on a view. Everything else lives in ink + paper.
 */

// Warm graphite-on-paper neutral ramp (the "drawing" tones)
const paper = {
  50: '#faf8f2',
  100: '#f5f1e8',
  200: '#e9e3d4',
  300: '#d8d0bb',
  400: '#b3a98f',
  500: '#847b62',
  600: '#5f5844',
  700: '#443f31',
  800: '#2b271f',
  900: '#1c1915',
  950: '#12100c',
}

// Redline — the architect's correction pencil. The only chromatic accent.
const accent = {
  50: '#fbf0ec',
  100: '#f6ddd4',
  200: '#eab9a8',
  300: '#dd8d74',
  400: '#cf5f41',
  500: '#c3341c',
  600: '#a3260f',
  700: '#7f1d0c',
  800: '#5c160b',
  900: '#3d0f08',
}

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        paper,
        ink: paper,
        accent,
        // Every legacy neutral family resolves to warm paper — nothing drifts cold.
        gray: paper,
        slate: paper,
        zinc: paper,
        neutral: paper,
        stone: paper,
        // Old brand/emerald primary → redline, so untouched surfaces re-tone too.
        emerald: accent,
        // Info/annotation panels resolve to a warm graphite note, not cool indigo.
        indigo: { 50: '#ece6d8', 100: '#ded6c4', 200: '#cbc0a6', 300: '#cbc0a6', 400: '#b3a98f', 500: '#847b62', 600: '#5f5844', 700: '#443f31', 800: '#2b271f', 900: '#1c1915' },
        purple: { 50: '#ece6d8', 100: '#ded6c4', 300: '#cbc0a6', 400: '#b3a98f', 500: '#847b62', 600: '#5f5844', 700: '#443f31', 800: '#2b271f', 900: '#1c1915' },
        // Quiet, drafting-ink semantics
        blue: { 50: '#eef2f6', 500: '#3c5a73', 600: '#33506a', 700: '#2a445b' },
        rose: accent,
        amber: { 50: '#f7f1e2', 500: '#9a7b23', 600: '#836819', 700: '#6a5414', 800: '#544110', 900: '#3f3009' },
        violet: { 50: '#f0eef4', 500: '#5a5170', 600: '#4d4560', 700: '#3f394f' },
        sky: { 50: '#eef2f6', 500: '#3c5a73', 700: '#2a445b' },
      },
      borderRadius: {
        none: '0',
        sm: '2px',
        DEFAULT: '3px',
        md: '4px',
        lg: '5px',
        xl: '7px',
        '2xl': '9px',
      },
      boxShadow: {
        // Drawings don't float. Elevation is a hairline; only overlays cast.
        none: 'none',
        pop: '0 10px 34px -12px rgb(28 25 21 / 0.28), 0 2px 6px -2px rgb(28 25 21 / 0.12)',
        inset: 'inset 0 0 0 1px rgb(28 25 21 / 0.06)',
      },
      letterSpacing: {
        mono: '0.02em',
        caps: '0.14em',
      },
      transitionTimingFunction: {
        mech: 'cubic-bezier(0.2, 0, 0, 1)',
        out: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'rise': { from: { opacity: '0', transform: 'translateY(5px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'pop-in': { from: { opacity: '0', transform: 'scale(0.98)' }, to: { opacity: '1', transform: 'scale(1)' } },
      },
      animation: {
        'fade-in': 'fade-in 0.16s cubic-bezier(0.2,0,0,1) both',
        'rise': 'rise 0.22s cubic-bezier(0.16,1,0.3,1) both',
        'pop-in': 'pop-in 0.14s cubic-bezier(0.16,1,0.3,1) both',
      },
    },
  },
  plugins: [],
}

export default config
