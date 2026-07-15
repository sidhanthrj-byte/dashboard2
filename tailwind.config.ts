import type { Config } from 'tailwindcss'

/**
 * Design system — one warm neutral, one accent.
 *
 * The app historically mixed `gray`, `slate`, `zinc` and `stone` on the same
 * screens. We collapse every neutral family onto a single tuned warm-neutral
 * scale so the whole product reads as one material. Changing this object
 * re-tones the entire app; no page markup needs to change.
 */
const neutral = {
  50: '#fafaf9',
  100: '#f5f5f4',
  200: '#e9e7e4',
  300: '#d7d3ce',
  400: '#a8a29d',
  500: '#78716c',
  600: '#57534e',
  700: '#44403c',
  800: '#292524',
  900: '#1c1917',
  950: '#0c0a09',
}

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        // Single source of truth for neutrals — every legacy family points here.
        gray: neutral,
        slate: neutral,
        zinc: neutral,
        neutral: neutral,
        stone: neutral,
        // Primary accent — deep emerald, used only for primary action / success.
        brand: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#059669',
          600: '#047857',
          700: '#065f46',
          800: '#064e3b',
          900: '#022c22',
        },
      },
      borderRadius: {
        '4xl': '1.75rem',
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgb(12 10 9 / 0.04)',
        sm: '0 1px 2px 0 rgb(12 10 9 / 0.04), 0 1px 3px 0 rgb(12 10 9 / 0.04)',
        DEFAULT: '0 1px 3px 0 rgb(12 10 9 / 0.05), 0 1px 2px -1px rgb(12 10 9 / 0.04)',
        md: '0 2px 8px -2px rgb(12 10 9 / 0.06), 0 1px 3px -1px rgb(12 10 9 / 0.04)',
        lg: '0 10px 28px -8px rgb(12 10 9 / 0.12), 0 2px 6px -2px rgb(12 10 9 / 0.05)',
        xl: '0 18px 44px -14px rgb(12 10 9 / 0.16), 0 4px 12px -4px rgb(12 10 9 / 0.06)',
        '2xl': '0 28px 64px -18px rgb(12 10 9 / 0.22), 0 6px 16px -6px rgb(12 10 9 / 0.07)',
      },
      letterSpacing: {
        tightest: '-0.03em',
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.97)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.25s cubic-bezier(0.4,0,0.2,1) both',
        'slide-up': 'slide-up 0.32s cubic-bezier(0.16,1,0.3,1) both',
        'scale-in': 'scale-in 0.2s cubic-bezier(0.16,1,0.3,1) both',
      },
    },
  },
  plugins: [],
}

export default config
