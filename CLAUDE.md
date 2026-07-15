# Pongs Quotation System

Next.js 14 (App Router) · TypeScript · Tailwind CSS · Turso (libsql).

## How it works (do not change)

- **Business logic is frozen.** Calculations (`src/lib/calculations.ts`), pricing
  (`src/lib/pricing.ts`), tax/GST, quantities, data models (`src/lib/types.ts`),
  API routes, auth/session (`src/lib/session.ts`), RBAC, routing and validation
  are correct and must produce identical numbers. Treat anything ambiguous as
  logic and leave it.
- DB access goes through `src/lib/db.ts` (libsql). `TURSO_URL` may be a
  `file:` URL for local throwaway testing. DB-backed API routes need
  `export const dynamic = 'force-dynamic'`.
- Auth: email-only login, `pongs_session` cookie. Middleware gates everything
  except `/login`, `/request-access`, and `/api/auth/*`. Admin is seeded as
  `sidhanthrj@gmail.com` on first auth-table init.
- Multi-company (STC / NLS) lives in `src/lib/companies.ts`. Pricing is
  identical across companies; only PDF branding differs.

## Design system — "Drafting Table" (authoritative)

The product estimates physical space, so the interface is modelled on an
architect's drawing set — not a SaaS dashboard. Every visual decision derives
from this. Tokens live in `tailwind.config.ts` and `src/app/globals.css`; use
them, never raw hex.

- **Neutrals are warm paper + graphite, never cool gray.** `gray/slate/zinc/
  neutral/stone` all resolve to the `paper` ramp in the Tailwind config — do not
  reintroduce a cold gray or a blue-tinted neutral.
- **One accent: redline vermillion (`accent` / `--accent`).** It is the
  architect's correction pencil — used only where attention is earned (active
  nav tick, the number that matters, required `*`, selected `.opt-on` tick,
  focus rings, destructive marks). Black ink is structure and primary actions.
  Never add a second chromatic accent, gradient, or glassmorphism.
- **Type:** `font-display` = Space Grotesk (headings). `font-sans` = Inter (UI).
  `font-mono`/`.fig` = IBM Plex Mono for every figure — currency, dimensions,
  quote refs, dates, counts — always tabular so columns don't dance.
- **Elevation is a hairline, not a shadow.** Surfaces are paper-on-paper with a
  `--rule` border and near-zero radius (2–5px). Only overlays cast (`shadow-pop`).
- **Labels are mono, uppercase, letter-spaced** (`.label`, `.eyebrow`) — they
  read as title-block field captions.
- **Selection is carried by a redline tick**, not a filled color: `.seg`/`.seg-on`
  for tabs, `.opt`/`.opt-on` for choice cells.
- **Motion is fast and mechanical** (~130–220ms, `--mech`/`--out`). It reports
  state; it never decorates.

Primitives (keep these class names; they are the vocabulary): `.btn` +
`.btn-primary`(ink) / `.btn-accent`(redline) / `.btn-secondary` / `.btn-ghost` /
`.btn-danger`; `.card`/`.sheet`; `.input` / `.select` / `.label` / `.eyebrow`;
`.badge-*` (mono dot callouts); `.seg`/`.seg-on`; `.opt`/`.opt-on`; `.fig`.

**Layout stances that must not regress into a generic template:**
- The quote builder is a **single-column worksheet** with a **persistent
  title-block bar** pinned to the bottom carrying the running total + save
  actions. It is *not* form-left / preview-right.
- The dashboard is a **register/ledger** — a title-block metrics strip over
  ruled rows with mono figures — *not* a grid of stat cards.
- Top nav is a **drawing-sheet title block** (mono tabs, redline active tick),
  not a generic SaaS topbar. Routes/architecture are unchanged.

If you extend the app, build screens from these primitives and stances. Do not
"modernize" — there is nothing older to modernize; this is the system.

## Commands

- `npm run dev` — dev server
- `npm run build` — production build (must pass; 37 routes)
- `node_modules/.bin/tsc --noEmit` — typecheck
