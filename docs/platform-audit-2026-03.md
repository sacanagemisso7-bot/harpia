# HireFlow AI Platform Audit

Date: 2026-03-18

## Executive summary

The current codebase is a strong late-MVP foundation. It already covers the core ATS workflow, has a coherent Prisma schema, real persistence, a polished B2B UI language, and good operational features such as billing, interviews, analytics, audit trail, and multitenancy.

The main architectural issue is not absence of features, but distribution of logic. Business rules exist, but they are spread across:

- route files in `app/(app)/*`
- server actions colocated with pages
- domain helpers in `lib/*`
- UI components that sometimes carry product logic

This creates a scaling risk for the next phase, where the product needs:

- asynchronous work
- organization knowledge ingestion
- company chat with internal tools
- desktop support
- richer recruiter operations

## Current folder audit

### Strong areas

- `lib/*` is already partially domain-oriented.
- `components/*` is grouped by feature and mostly reusable.
- `app/*` follows App Router well and keeps marketing/auth/app separated.
- `prisma/schema.prisma` is rich and relatively consistent with product scope.
- `lib/env.ts` already validates environment variables.
- auth, billing, analytics, and interviews already have meaningful domain logic.

### Weak areas

- No unified `modules/*` service layer yet.
- No background jobs runtime.
- No knowledge domain.
- No chat domain.
- No desktop-facing API surface or SDK boundary.
- No test harness.
- No explicit repository/service/action pattern across domains.

## Existing domains mapped

- Auth and session
- Organizations and memberships
- Team invites and roles
- Jobs and criteria
- Candidates and resumes
- Applications and scoring
- Pipeline
- Interviews and feedback
- Communications and templates
- Analytics and SLA signals
- Billing and revenue ops
- Careers/public inbound
- Audit and observability
- Storage and file handling

## Architectural strengths

- Strong Prisma-first data modeling
- Good multitenant scoping by `organizationId`
- Reasonable RBAC start with permission matrix
- Premium UI direction already established
- App shell is reusable and product-grade
- AI logic is isolated enough to centralize further
- Billing and operational metrics show product maturity

## Fragile points

### 1. Large route files and action files

The biggest maintainability risk today is file growth:

- `app/(app)/settings/billing/page.tsx`
- `app/(app)/settings/actions.ts`
- `app/(app)/settings/page.tsx`
- `app/(app)/applications/[applicationId]/page.tsx`
- `app/(app)/interviews/actions.ts`
- `app/(app)/candidates/actions.ts`

These files are carrying multiple responsibilities:

- orchestration
- validation
- business rules
- persistence
- audit logging
- redirect/revalidation concerns

### 2. Domain logic split between `app/*` and `lib/*`

There is already domain logic in `lib/*`, but actions often still assemble the business flow themselves. The next phase needs clearer layers:

- repository/query
- service/use-case
- action/controller
- UI

### 3. AI is feature-local, not platform-level

Current AI capabilities are useful but scattered:

- resume parsing
- score refinement
- stage copilot

There is no unified orchestration for:

- tools
- retrieval
- prompt templates
- context building
- usage observability

### 4. No async processing boundary

Heavy work is still mostly request-driven:

- resume parsing
- email dispatch
- future document ingestion
- analytics recomputation

That is acceptable for MVP, but risky for a recruiting OS with chat and knowledge ingestion.

### 5. Storage is partly generic, partly domain-specific

`lib/storage/provider.ts` is useful, but file path semantics still reflect resume uploads more than a general document platform.

### 6. Desktop reuse path is not formalized

The web app has reusable types and tokens implicitly, but there is no shared package or public API contract for a desktop client yet.

## What is incomplete but already hinted at

- AI platform layer
- richer operational inbox
- hiring manager portal specialization
- public/product marketing layer for expansion
- stronger shared packages strategy
- multi-surface client architecture

## What can be reused for desktop

- auth model and credentials flow
- billing and workspace context
- analytics aggregates
- interview agenda data
- inbox-worthy operational signals
- chat tool data sources
- design tokens from current CSS variables
- shared entity types inferred from Prisma/domain models

## What should become shared libraries

- design tokens and surface styles
- permission contracts
- chat tool contracts
- DTO/view-model types for desktop
- environment and config helpers
- AI prompt/context builders

## Inconsistencies found

- README still describes the project as a simpler MVP than the schema and routes now support.
- `docs/architecture.md` is outdated relative to multi-org, billing, and revenue ops.
- no explicit job processing configuration yet, despite several workflows already wanting async boundaries
- route protection is good, but new product surfaces will require permissions beyond the current matrix

## Audit conclusion

This is the right moment for an incremental platformization pass:

1. keep the web app intact
2. add a new domain layer beside the existing `lib/*`
3. introduce async jobs
4. add knowledge and company chat on top of the current ATS data
5. prepare desktop as a new client, not a rewrite
