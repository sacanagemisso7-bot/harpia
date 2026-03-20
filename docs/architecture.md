# HireFlow AI Architecture

## Product shape

HireFlow AI is structured as a vertical SaaS for SMB recruiting teams with a single application codebase and simple multitenancy via `organizationId`.

## Core decisions

- Next.js App Router for product UI, server actions, route protection, and API handlers.
- Prisma + PostgreSQL for transactional data and strong schema evolution.
- Auth.js with credentials for fast MVP delivery and future provider expansion.
- Tailwind + shadcn/ui primitives for a polished, reusable B2B interface.
- Domain-first organization in `lib/*` and `components/*` to keep business logic outside route files.
- Local resume storage abstraction for MVP, designed to swap to S3-compatible storage later.
- OpenAI integration behind `lib/ai/*` so prompts and parsing stay isolated from UI and persistence.

## Multitenancy model

- Every business entity is scoped to `organizationId`.
- Each authenticated user belongs to exactly one organization in the MVP.
- Queries should always resolve through the authenticated user's organization context.
- The schema already supports multiple organizations without needing separate deployments.

## Folder strategy

- `app/*`: routes, layouts, loading and error boundaries, route handlers.
- `components/*`: UI primitives and feature-oriented visual components.
- `lib/auth/*`: auth helpers, password logic, session guards.
- `lib/dashboard/*`: dashboard aggregations and view models.
- `lib/jobs/*`: job domain queries and write actions.
- `lib/ai/*`: OpenAI client, prompt contracts, and structured parsing.
- `lib/validations/*`: zod schemas shared between forms and server actions.
- `prisma/*`: schema and seed.

## MVP domains

- Authentication and access control
- Organizations and users
- Jobs and job criteria
- Candidates and resumes
- Applications, scoring, and pipeline history
- Email templates
- AI parsing and evaluation

## Delivery phases

1. Foundation: architecture, auth, schema, design system, dashboard shell
2. Hiring operations: jobs, candidates, uploads, pipeline
3. AI workflows: resume parsing, scoring, interview questions
4. Customer readiness: email templates, settings, demo data, deployment docs
