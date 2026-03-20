# HireFlow AI Target Architecture

Date: 2026-03-18

## Guiding principle

Evolve the current product into a recruiting operating system without resetting the codebase. The architecture should stay incremental, product-first, and locally runnable.

## Target shape

- Keep the current Next.js web app as the main product surface.
- Introduce a `modules/*` layer for new platform capabilities and future migration of old logic.
- Add a Prisma-backed background job runtime with optional inline processing in local environments.
- Add organization knowledge and company chat as first-class domains.
- Add a desktop client as a separate app that consumes authenticated backend endpoints.

## Layer model

### 1. Route/UI layer

- `app/*`
- `components/*`

Responsibilities:

- layouts
- pages
- route handlers
- form wiring
- server action entrypoints

### 2. Module layer

- `modules/auth`
- `modules/knowledge`
- `modules/company-chat`
- `modules/background-jobs`
- `modules/recruiting-ops`
- `modules/hiring-intelligence`

Responsibilities:

- use-cases
- orchestration
- domain contracts
- tool definitions
- background processors

### 3. Infrastructure layer

- `lib/prisma`
- `lib/storage`
- `lib/email`
- `lib/observability`
- `lib/ai/openai`

Responsibilities:

- adapters
- external services
- persistence primitives
- low-level helpers

### 4. Shared product contracts

For now:

- keep in `types/*` and `modules/*/types.ts`

Later, if desktop grows:

- extract to `packages/types`
- extract tokens to `packages/ui` or `packages/design-tokens`

## New domains introduced in this phase

### Background jobs

- queue records in Prisma
- retries and status transitions
- inline processing for local/dev
- cron/worker entrypoint for production

### Knowledge

- organization documents
- ingestion status
- extracted text
- chunks prepared for retrieval and embeddings

### Company chat

- thread and message history
- organization-scoped context
- internal tools
- action proposals with confirmation

### Recruiting ops

- operational inbox
- pending work and stalled flow signals

### Hiring intelligence

- shortlist recommendations
- side-by-side reasoning blocks
- pipeline intelligence cards

## Desktop strategy

Do not migrate the web app into a monorepo right now.

Reason:

- the web app is already working
- a full workspace migration adds operational risk
- the priority is product surface expansion

Instead:

- create `apps/desktop`
- keep it isolated
- consume backend endpoints
- mirror design tokens progressively

If the desktop client becomes active and shared code starts duplicating, move to:

- `apps/web`
- `apps/desktop`
- `packages/ui`
- `packages/types`
- `packages/sdk`

## Migration plan

### Phase A

- audit documentation
- add background jobs
- add knowledge schema and UI
- add company chat schema and UI
- add recruiter ops inbox

### Phase B

- move selected logic from `app/*/actions.ts` into `modules/*`
- start using jobs for resume parsing and email dispatch
- add hiring intelligence widgets

### Phase C

- introduce desktop client
- add desktop-oriented APIs and SDK contracts
- improve shared tokens and cross-surface consistency

### Phase D

- deeper packaging strategy if reuse pressure justifies it
- more advanced AI retrieval and action execution
- external workers and production-grade job runners
