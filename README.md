# HireFlow AI

HireFlow AI is evolving into a People & Internal Operations OS: a premium SaaS platform for internal people operations, employee management, service workflows, company knowledge, corporate AI assistance, desktop productivity, and hiring as a complementary module. This repository contains the working production-oriented foundation built with Next.js, Prisma, protected routes, real persistence, a native desktop client, and connected operational flows across recruiting, people ops, chat, billing, and internal operations.

## Current MVP coverage

- Authentication with login, logout, protected routes, and multi-org memberships
- Role-aware access control for owner, admin, people admin, people ops, manager, recruiter, hiring manager, and employee roles
- Internal operations dashboard focused on people ops, service desk, compliance, and execution backlog
- Employee management with directory, employee profile, manager relationships, lifecycle state, notes, and relevant history
- Onboarding and offboarding workflow templates, runs, steps, auto-generated tasks, compliance items, and people events
- People task management with assignees, due dates, priorities, comments, and workflow-linked automation
- Internal RH service desk with requests, categories, priority, SLA tracking, status, assignee, and comments
- Lightweight compliance operations with pending documents, policy acceptance scaffolding, and audit-ready visibility
- People calendar and internal events tied to workflows, milestones, and employee lifecycle operations
- Check-ins and lightweight employee follow-up records for onboarding, probation, feedback, and notes
- Knowledge base with upload, ingestion, chunking, retrieval preparation, and policy-style documents
- Company chat with internal ops context, related entities, suggested prompts, tool traces, and assisted actions
- Native desktop client in `apps/desktop` with executive home, inbox, tasks, requests, calendar, quick actions, and company chat
- Recruiting module preserved with jobs, candidates, applications, pipeline, interviews, analytics, public careers pages, and scoring
- Billing, usage, upgrades, and revenue operations infrastructure still active for SaaS packaging
- Background jobs runtime prepared for parsing, scoring, reminders, SLA alerts, compliance alerts, knowledge ingestion, and internal summaries
- Audit trail, readiness endpoints, health checks, and production-oriented build pipeline
- Demo seed updated with internal operations data: employees, onboarding, offboarding, requests, tasks, compliance, and chat examples
- Modern UI foundation using Tailwind CSS and shadcn-style primitives

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui-style component foundation
- Prisma
- PostgreSQL
- Auth.js credentials authentication
- OpenAI-compatible AI runtime with Gemini support
- Tauri desktop client foundation in `apps/desktop`

## Project structure

```text
app/
  (marketing)/        landing page
  (auth)/login/       authentication flow
  (app)/              protected application area
  api/auth/           Auth.js route handler
  api/v1/desktop/     desktop-specific API surface
apps/
  desktop/            native desktop client (Tauri + Vite + React)
components/
  auth/               auth UI
  dashboard/          dashboard cards
  jobs/               hiring module UI
  layout/             app shell and navigation
  people/             internal operations and command center views
  ui/                 reusable primitives
lib/
  ai/                 OpenAI client and future AI workflows
  auth/               session/password helpers
  dashboard/          dashboard queries
  prisma/             Prisma client
modules/
  ai/                 AI utilities and async jobs
  company-chat/       company chat runtime, tools, and actions
  compliance/         compliance summaries and queries
  desktop/            desktop bootstrap and inbox queries
  employees/          employee services, queries, and validators
  hr-requests/        internal RH service desk
  people-ops/         onboarding, offboarding, events, and command center
  people-tasks/       operational task domain
  recruiting/         preserved hiring module
prisma/
  schema.prisma       database schema
  seed.ts             demo seed
docs/
  architecture.md     original architecture decisions
  internal-ops-*.md   pivot audit and target architecture
```

## Environment variables

Copy `.env.example` to `.env.local` or `.env` and adjust:

```bash
DATABASE_URL="postgresql://hireflow:hireflow123@127.0.0.1:5434/hireflow_ai?schema=public"
DIRECT_URL="postgresql://hireflow:hireflow123@127.0.0.1:5434/hireflow_ai?schema=public"
AUTH_SECRET="replace-with-a-long-random-secret"
NEXTAUTH_URL="http://localhost:3000"
AI_PROVIDER="openai"
OPENAI_API_KEY=""
OPENAI_BASE_URL=""
OPENAI_RESUME_MODEL="gpt-4o-mini"
OPENAI_CHAT_MODEL="gpt-4o-mini"
GEMINI_API_KEY=""
GEMINI_MODEL="gemini-2.5-flash"
FILE_STORAGE_DRIVER="local"
S3_BUCKET=""
S3_REGION=""
S3_ENDPOINT=""
S3_ACCESS_KEY_ID=""
S3_SECRET_ACCESS_KEY=""
S3_FORCE_PATH_STYLE="false"
SMTP_HOST=""
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER=""
SMTP_PASSWORD=""
EMAIL_FROM="HireFlow AI <noreply@hireflow.ai>"
STRIPE_SECRET_KEY=""
STRIPE_WEBHOOK_SECRET=""
STRIPE_PRICE_STARTER_MONTHLY=""
STRIPE_PRICE_STARTER_ANNUAL=""
STRIPE_PRICE_GROWTH_MONTHLY=""
STRIPE_PRICE_GROWTH_ANNUAL=""
STRIPE_PRICE_BUSINESS_MONTHLY=""
STRIPE_PRICE_BUSINESS_ANNUAL=""
CRON_SECRET=""
BACKGROUND_JOBS_INLINE="true"
REVENUE_OPS_EMAILS=""
OBSERVABILITY_WEBHOOK_URL=""
OBSERVABILITY_SERVICE_NAME="hireflow-ai"
APP_URL="http://localhost:3000"
UPLOAD_DIR="./uploads"
SEED_ADMIN_EMAIL="founder@hireflow.ai"
SEED_ADMIN_PASSWORD="ChangeMe123!"
```

### Gemini

The AI runtime now supports Gemini through the OpenAI-compatible endpoint documented by Google AI. A minimal local setup looks like:

```bash
AI_PROVIDER="gemini"
GEMINI_API_KEY="your-gemini-key"
GEMINI_MODEL="gemini-2.5-flash"
OPENAI_BASE_URL="https://generativelanguage.googleapis.com/v1beta/openai/"
```

If you stay on OpenAI, keep `AI_PROVIDER="openai"` and use the existing `OPENAI_*` variables.

### Supabase

Supabase fits this codebase well because the app already uses Prisma over PostgreSQL. Supabase documents three main connection patterns: direct connection for persistent servers that support IPv6, session pooler for persistent clients with IPv4/IPv6 support, and transaction pooler for temporary clients such as serverless or edge functions. Supabase also notes that Supavisor is intended for ORMs like Prisma when you need server-side pooling.

Recommended setup for this repo:

```bash
# app runtime with pooling
DATABASE_URL="postgresql://prisma.<project-ref>:<password>@<region>.pooler.supabase.com:5432/postgres"

# migrations / admin connection
DIRECT_URL="postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres"
```

If your runtime is serverless, you can switch `DATABASE_URL` to the transaction pooler on port `6543`, but keep `DIRECT_URL` pointing at the direct database host for migrations when your environment supports it.

I kept the project database-agnostic at the Prisma/Postgres layer, so switching to Supabase is mostly an environment change rather than an app rewrite.

## Getting started

1. Install dependencies:

```bash
npm install
```

2. Start the local PostgreSQL instance:

```bash
npm run db:up
```

To stop the local database later:

```bash
npm run db:down
```

3. Generate Prisma client:

```bash
npm run db:generate
```

4. Run migrations or push schema to your PostgreSQL database:

```bash
npm run db:migrate
```

Or:

```bash
npm run db:push
```

If you pulled the latest version after notes/collaboration, team invites, interview feedback, audit trail, multi-org memberships, billing add-ons, revenue ops approvals, background jobs, knowledge base, or company chat were added, run `db:push` or `db:migrate` again because the Prisma schema changed.

Health checks:

```bash
GET /api/health
GET /api/ready
```

5. Seed demo data:

```bash
npm run db:seed
```

6. Start the app:

```bash
npm run dev
```

## Demo credentials

- Email: `founder@hireflow.ai`
- Password: `ChangeMe123!`

You can override both values with `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`.

## Implemented product decisions

- Credentials-based auth for fast MVP delivery and reliable private admin access
- JWT session strategy to keep auth lightweight during the early product stage
- Domain records scoped by `organizationId` to support future multitenancy
- Server components and server actions used for secure data access and writes
- Route groups split into marketing, auth, and protected application areas
- Job criteria modeled explicitly to support explainable scoring later

## Available routes

- `/` landing page
- `/login` sign-in page
- `/dashboard` internal operations home
- `/people/command-center` HR command center
- `/ops/inbox` operations inbox
- `/employees` employee directory
- `/employees/[employeeId]` employee profile
- `/requests` internal RH service desk
- `/people/tasks` people tasks backlog
- `/people/onboarding` onboarding workflows
- `/people/offboarding` offboarding workflows
- `/people/calendar` people calendar and internal events
- `/people/compliance` lightweight compliance visibility
- `/jobs` job listing
- `/jobs/new` create job
- `/jobs/[jobId]` job detail
- `/jobs/[jobId]/edit` edit job
- `/candidates` candidate listing
- `/candidates/new` create candidate
- `/candidates/[candidateId]` candidate detail, resume uploads, and AI analysis
- `/applications/[applicationId]` application detail with score and history
- `/pipeline` board view of the hiring process
- `/interviews` upcoming interview agenda
- `/knowledge` organization knowledge base
- `/chat` company chat workspace
- `/hiring` hiring hub inside the broader platform
- `/interviews/[interviewId]` interview workspace with feedback and calendar actions
- `/invite/[token]` invite acceptance and password setup
- `/api/health` liveness endpoint
- `/api/ready` readiness endpoint with dependency checks
- `/analytics` analytics dashboard
- `/communications` email template management
- `/settings` organization settings and integration readiness
- `/settings/billing` billing, usage, invoices, and upgrades
- `/ops/revenue` internal revenue operations view for approvals and tenant revenue monitoring
- `/careers/[slug]` public careers page for an organization
- `/careers/[slug]/jobs/[jobId]` public application page
- `/api/cron/billing` protected lifecycle endpoint for trial expiration and billing reminders
- `/api/cron/jobs` protected lifecycle endpoint for queued async jobs
- `/api/billing/invoices/export` CSV export for invoice history when the plan allows it
- `/api/v1/desktop/session` desktop login and session token issuance
- `/api/v1/desktop/bootstrap` desktop bootstrap payload
- `/api/v1/desktop/inbox` desktop inbox payload
- `/api/v1/desktop/chat/threads` desktop chat workspace payload
- `/api/v1/desktop/chat/messages` desktop chat message creation
- `/api/v1/desktop/chat/actions` desktop assisted actions

## Validation

The current foundation was validated with:

```bash
npm run lint
npm run build
```

## Next build phases

The next implementation blocks after this round are:

1. Native notifications and deeper desktop integrations
2. Granular RBAC refinement for employee self-service and manager-specific flows
3. More internal automations for SLA breach prevention, reminder orchestration, and escalation
4. Semantic retrieval and richer policy assistance across knowledge + chat
5. Observability and production hardening

## Notes

- The Prisma schema already includes candidate, resume, application, pipeline, and email template models even where UI flows are not exposed yet.
- `@auth/prisma-adapter` is installed for future provider expansion, but the current MVP auth flow uses credentials plus JWT without the adapter.
- Resume parsing with the configured AI provider is implemented in `lib/ai/resume-parser.ts` and updates `candidate.parsedProfile`.
- If no supported AI key is configured, AI-assisted actions fall back gracefully where the product supports fallback behavior.
- Application scoring is implemented in `lib/applications/scoring.ts` with a heuristic fallback and optional AI refinement when AI is configured.
- Email sending is implemented with SMTP via `nodemailer` and is only enabled when `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`, and `EMAIL_FROM` are configured.
- File storage is abstracted in `lib/storage/provider.ts` and supports `local` or `s3` drivers through environment variables.
- Jobs and candidates now support filters, sorting, and pagination through URL search params.
- Public inbound applications are handled through `/careers/[slug]` and can optionally include resume upload.
- Internal collaboration is implemented through hiring notes attached to candidates and applications.
- Team onboarding now supports invitation links, role assignment, and invite acceptance with password creation.
- Interview operations now support structured feedback, `.ics` calendar exports, and interview invite email attachments.
- Critical actions now register audit events visible in `/settings`.
- Deployment monitoring can use `/api/health` and `/api/ready`.
- Users can now belong to multiple organizations and switch the active workspace from the app shell.
- Analytics now expose SLA-style operational metrics for funnel responsiveness.
- External observability can optionally receive forwarded audit events via `OBSERVABILITY_WEBHOOK_URL`.
- Revenue operations now support trial expiration, downgrade behavior, billing reminder emails, and feature gating by plan.
- Stripe checkout now supports monthly or annual plan selection and allows promo codes directly in checkout when configured.
- Billing limits can now be expanded with extra seats and AI add-on units without changing the base plan.
- Billing profiles now support legal entity, tax/VAT note fields, billing contact email, country, and custom AI overage pricing.
- Commercial teams can review billing upgrade requests in `/ops/revenue` when `REVENUE_OPS_EMAILS` includes their login email.
- Revenue ops now projects tenant-level MRR, ARR, and AI overage revenue across workspaces.
- Async work now goes through Prisma-backed background jobs with optional inline processing for local development.
- The knowledge base stores organization documents, extracted text, summaries, and chunks prepared for retrieval.
- Company chat now persists threads and messages, reads organization context, and can propose actions such as note creation, stage movement, and shortlist saving.
- A Tauri desktop foundation now lives in `apps/desktop` with shell, inbox, interviews, quick actions, and chat surface.
- `POST /api/cron/billing` requires `CRON_SECRET` via `x-cron-secret` or `Authorization: Bearer ...`.
- `POST /api/cron/jobs` requires `CRON_SECRET` via `x-cron-secret` or `Authorization: Bearer ...`.

## Testing the new flows

1. Run `npm run db:push` and `npm run db:seed` to materialize the latest schema and internal operations seed data.
2. Open `/dashboard` and `/people/command-center` to validate the internal operations home and HR command center.
3. Open `/employees` and `/employees/[employeeId]` to review directory, lifecycle, tasks, requests, compliance, and check-ins.
4. Open `/people/onboarding` and `/people/offboarding` to validate workflow runs, progress, and generated operational steps.
5. Open `/requests` to review the internal RH service desk queue and comments.
6. Open `/people/tasks` to review manual tasks plus workflow-generated tasks.
7. Open `/people/calendar` and `/people/compliance` to validate events, reminders, and pending compliance items.
8. Open `/knowledge` to review uploaded or seeded internal knowledge documents and policy-ready content.
9. Open `/chat` and ask about onboarding, requests, tasks, compliance, employees, and hiring to validate the company chat pivot.
10. Start the desktop client with `npm run desktop:dev` and validate home, inbox, tasks, requests, calendar, and chat.
11. Open `/hiring`, `/jobs`, `/pipeline`, `/interviews`, and `/analytics` to confirm hiring still works as a complementary module.
12. Open `/careers/hireflow-demo` to test the public inbound hiring surface.
13. Open `/settings` and `/settings/billing` to validate workspace, audit, billing, limits, and upgrade surfaces.
14. Test `GET /api/health` and `GET /api/ready` as deployment checks.
15. Trigger `POST /api/cron/jobs` or run `npm run jobs:process` if you disable inline processing.

## Desktop

The repository now includes `apps/desktop`, a Tauri desktop foundation for:

- backend-connected login
- executive home for internal operations
- operational inbox
- people tasks queue
- internal RH requests queue
- people calendar and internal events
- quick actions
- company chat with threads, tool traces, and assisted actions
- hiring snapshot as a complementary module
- future notifications and auto-update

To evolve it locally, use the instructions in [apps/desktop/README.md](/C:/Users/onome/agente/apps/desktop/README.md).

## Docker

Build:

```bash
docker build -t hireflow-ai .
```

Run:

```bash
docker run --env-file .env -p 3000:3000 hireflow-ai
```
