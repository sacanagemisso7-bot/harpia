# HireFlow AI HR OS Audit

Date: 2026-03-18

## Executive summary

HireFlow is no longer a simple ATS MVP. The current codebase already behaves like a real recruiting product with meaningful operational depth:

- recruiting workflows
- analytics and SLA visibility
- billing and team management
- knowledge ingestion
- company chat
- background jobs
- desktop bootstrap APIs
- audit trail and multitenancy

That is a strong foundation for the next phase.

The right move is not a rewrite. The right move is to evolve the product from a recruiting suite into an HR Operating System with four connected pillars:

1. Recruiting OS
2. People Ops Hub
3. Company Chat
4. Desktop Productivity App

The main challenge is not "missing frontend". The main challenge is that the platform still has a recruiting-first data model, recruiting-first navigation, and recruiting-first permissions. To become indispensable for modern HR teams, HireFlow needs a canonical people operations layer with reusable workflow primitives, employee lifecycle records, and operational dashboards.

## Current pillar assessment

### 1. Recruiting OS

Status: strong and worth preserving.

What already exists and is good:

- jobs, candidates, resumes, applications, pipeline, interviews
- AI resume parsing and application scoring
- analytics with SLA-style alerts
- communication templates and email delivery
- public careers page and inbound application flow
- billing, plans, usage, and upgrade workflows
- team invites, roles, memberships, and workspace switching
- audit events
- background job runtime
- premium-looking shell and dashboard foundation

What needs refinement, not replacement:

- clearer domain boundaries between routes, actions, and services
- more cohesive navigation and language
- better surfaces for operational work instead of page-by-page management
- stronger connection between recruiting outcomes and downstream people operations

### 2. People Ops Hub

Status: product gap.

Today the platform has almost no first-class people operations domain. There is no canonical employee model and no operational layer for:

- onboarding
- offboarding
- employee requests
- people tasks
- internal HR calendar
- check-ins and lightweight feedback
- pulse surveys
- directory and org chart
- compliance tracking

This is the biggest gap between current product shape and the target HR OS vision.

### 3. Company Chat

Status: promising, but still recruiting-first.

What already exists:

- chat threads and persisted messages
- assistant replies with related entities
- internal tool traces
- assisted actions such as notes, stage movement, shortlists, email draft, and interview scheduling
- knowledge lookup
- desktop chat APIs

Current limitation:

- tools mostly cover recruiting and knowledge search
- permission enforcement is coarse
- action model is still narrow
- chat cannot yet read or act on people ops data because the underlying domains do not exist

### 4. Desktop Productivity App

Status: strong shell, limited business scope.

What already exists:

- separate `apps/desktop` Tauri app
- desktop session token flow
- bootstrap, inbox, and chat API endpoints
- a working operational cockpit pattern

Current limitation:

- desktop is still a recruiting companion surface
- no people ops inbox
- no daily HR command center
- no people task or request workflows
- no reminders or event-driven local productivity layer yet

## Architectural strengths to preserve

- Prisma schema discipline and transactional model
- `organizationId` scoping across business entities
- App Router foundation with protected routes
- existing billing and usage model
- audit logging pattern
- background jobs runtime and cron entrypoint
- knowledge ingestion pipeline
- premium B2B visual language already present in the app shell
- typed desktop DTOs in `types/*`

## Core blockers for the HR OS phase

### 1. No canonical employee domain

The current product models recruiting records and internal users, but not employees as an operational business entity. That blocks:

- onboarding ownership
- offboarding ownership
- manager relationships
- directory and org chart
- employee profile
- compliance and policy tracking
- requests and people tasks by employee

Without a first-class employee record, People Ops cannot become a real product pillar.

### 2. Workflow primitives are missing

Onboarding and offboarding need more than screens. They need reusable workflow building blocks:

- templates
- checklist items
- assignment rules
- due dates
- statuses
- reminders
- automation triggers
- auditability

The codebase has job automation rules, but not a general operational workflow system that People Ops can reuse.

### 3. Permission model is too narrow

Current roles are:

- OWNER
- ADMIN
- RECRUITER
- HIRING_MANAGER

That is enough for recruiting, but not enough for an HR OS that also serves:

- head of HR
- people ops
- internal operations
- employees
- founders with executive visibility

The platform needs either more roles or a more granular capability layer, ideally both.

### 4. Navigation is product-area thin

Current navigation is still flat and recruiting-led. That works for the current ATS, but a broader HR OS needs grouped navigation and stronger entry points:

- Command Center
- Recruiting
- People Ops
- Knowledge and Chat
- Admin and Billing

### 5. Domain layering is only partially complete

The repo already has both `lib/*` and `modules/*`, but the split is not yet systematic.

Current pattern:

- older domains still rely heavily on `lib/*`
- newer platform work started moving into `modules/*`
- route actions often still orchestrate business logic directly

For the HR OS phase, new work should stop adding business logic to route files and should land in domain modules first.

### 6. Background jobs are real, but too limited for people operations

The runtime exists and is a solid base. The current job catalog is still mostly recruiting-centric:

- RESUME_PARSE
- APPLICATION_SCORE
- EMAIL_DELIVERY
- KNOWLEDGE_INGEST
- ANALYTICS_REBUILD

People Ops will need many more async responsibilities:

- onboarding plan generation
- offboarding plan generation
- reminders
- request SLA alerts
- check-in nudges
- pulse aggregation
- compliance reminders
- operational summaries

### 7. Company chat lacks a broader enterprise data surface

The assistant runtime is already useful, but the tool layer does not yet cover:

- employees
- onboarding plans
- offboarding plans
- HR requests
- people tasks
- compliance
- check-ins
- pulse signals
- command-center summaries

The chat can only become a true HR copilot after the People Ops Hub introduces these business objects.

## Operational seams we can reuse immediately

These are the best existing extension points for the next phase:

- `prisma/schema.prisma` for adding new HR OS entities
- `lib/auth/*` for session and permission enforcement
- `lib/audit/*` for action and workflow visibility
- `modules/background-jobs/*` for reminders and async operations
- `modules/company-chat/*` for tool-driven assistant expansion
- `types/desktop.ts` and desktop APIs for multi-surface delivery
- `components/layout/*` for enterprise shell evolution
- `modules/knowledge/*` for policy and handbook retrieval

## Product gaps by new module

### Onboarding

Missing today:

- templates
- per-employee onboarding plans
- task owners across HR, manager, IT, and employee
- required documents
- due dates and progress
- automation from hiring outcomes

### Offboarding

Missing today:

- offboarding plans
- access closure tracking
- equipment return tracking
- exit interview workflow
- process history

### HR requests

Missing today:

- request records
- categories and priorities
- SLA timers
- comments and responsibility handoff
- employee and manager self-serve views

### People tasks

Missing today:

- assignable operational task system
- due date and priority model
- task source tracking
- auto-generated tasks from workflows and alerts

### Internal calendar

Missing today:

- HR-specific events
- reminders linked to people workflows
- onboarding sessions
- probation review reminders
- exit interview reminders

### Check-ins and feedback

Missing today:

- lightweight 1:1 notes
- follow-up tracking
- missing check-in alerts

### Pulse

Missing today:

- surveys
- response aggregation
- executive pulse snapshot

### Directory and org chart

Missing today:

- employee profiles
- manager chain
- org view
- searchable internal directory

### Compliance

Missing today:

- policy acknowledgements
- pending document tracking
- critical task visibility
- compliance summary by employee and org

## Audit conclusion

HireFlow is ready for the HR OS phase because the recruiting base is already credible. The missing piece is not a prettier dashboard. The missing piece is a reusable People Ops operating layer that turns employee lifecycle work into structured workflows, tasks, requests, alerts, and copiloted actions.

The next phase should therefore do four things in order:

1. add a canonical people domain and People Ops workflow primitives
2. connect those primitives to recruiting outcomes, chat, and desktop
3. introduce HR command-center surfaces and employee-centric views
4. expand permissions, jobs, and automations so the product reduces repetitive HR work instead of just displaying it
