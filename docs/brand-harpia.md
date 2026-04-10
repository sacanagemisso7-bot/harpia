# Harpia Brand Notes

## Concept

Harpia is the strategic operating system for hiring and people operations.

Core signals:

- vision
- precision
- clarity
- confidence
- calm authority

The product should feel premium, executive, disciplined and highly legible.

## Visual Direction

- dark-first, but clean in light mode
- sharp and geometric without aggression
- premium surfaces with restrained depth
- forest green as the primary brand signal
- muted gold as a rare premium accent
- neutral graphite foundations
- minimal glow and no startup-AI gimmicks

## Color Tokens

Primary reference colors:

- forest green: `#0F3D2E`
- graphite: `#111315`
- ivory: `#F5F3EE`
- muted gold: `#B08D57`

Implemented token anchors:

- web: `--brand-forest`, `--brand-graphite`, `--brand-ivory`, `--brand-gold` in `/app/globals.css`
- desktop: `--brand-forest`, `--brand-gold`, `--brand-ivory` in `/apps/desktop/src/styles.css`

Supporting rules:

- green should lead actions and focus states
- gold should appear sparingly in logo details and premium accents
- neutrals should carry most surfaces and layout structure

## Logo System

Primary implementation lives in `/components/brand/harpia-logo.tsx`.

Available variants:

- `full`
- `compact`
- `icon`

Design logic:

- abstract geometric H
- central bridge for precision/focus
- top gold crest for distinction
- no mascot, bird illustration or circuit metaphor

Usage guidance:

- use `compact` in shells, auth and nav
- use `full` in larger brand anchors
- use `icon` only where the wordmark would create noise

## Typography

- display: IBM Plex Sans
- body: Plus Jakarta Sans
- mono: IBM Plex Mono

Rules:

- tight tracking on brand titles and major headings
- strong hierarchy through spacing before color
- avoid playful or overly promotional text styling

## Copy Guidance

Preferred territory:

- veja alem do curriculo
- contrate com mais clareza
- precisao para decidir melhor
- inteligencia operacional para RH

Guidelines:

- do not overuse "AI" in headlines
- describe clarity, control and decision quality before automation
- write like premium B2B software, not a hype-driven startup
- keep language calm, direct and credible

## Major Files Changed

- `/lib/brand.ts`
- `/components/brand/harpia-logo.tsx`
- `/app/layout.tsx`
- `/app/globals.css`
- `/components/marketing/site-chrome.tsx`
- `/components/layout/app-shell.tsx`
- `/app/(marketing)/page.tsx`
- `/app/(marketing)/book-demo/page.tsx`
- `/app/(marketing)/pricing/page.tsx`
- `/app/(auth)/login/page.tsx`
- `/app/(auth)/invite/[token]/page.tsx`
- `/components/auth/login-form.tsx`
- `/app/(marketing)/careers/[slug]/page.tsx`
- `/app/(marketing)/careers/harpia/page.tsx`
- `/app/(marketing)/careers/harpia/jobs/[jobId]/page.tsx`
- `/app/(app)/settings/actions.ts`
- `/lib/billing/lifecycle.ts`
- `/lib/calendar/ics.ts`
- `/app/api/billing/invoices/export/route.ts`
- `/apps/desktop/src/App.tsx`
- `/apps/desktop/src/styles.css`
- `/apps/desktop/index.html`
- `/apps/desktop/src-tauri/tauri.conf.json`

## Intentional Legacy References

Some identifiers remain on purpose for compatibility or low-risk preservation:

- legacy careers slug support via `hireflow-demo`
- desktop storage fallback keys for existing sessions/theme
- package names and Tauri identifier
- observability and low-level service identifiers
