# HireFlow AI Internal Operations Target Architecture

Date: 2026-03-18

## Product north star

Evolve HireFlow into a `People & Internal Operations OS`.

The product should feel like the internal operating center for people and process management across the company, with strong daily value for:

- HR
- People Ops
- managers
- founders
- internal operations teams
- employees in selected self-serve flows

Hiring remains part of the platform, but no longer defines the product identity.

## Product hierarchy

The new product order should be:

1. People Ops Hub
2. Employee Management
3. Internal RH Service Desk
4. Knowledge Base
5. Company Chat
6. Desktop Operations App
7. Hiring Module

This hierarchy should guide architecture, navigation, dashboards, and naming.

## Core design principle

Do not build isolated features.

Build a coherent internal operations system where the same core business objects power:

- web workflows
- dashboards
- desktop
- notifications
- assistant actions
- audit
- async jobs

## Incremental strategy

### Keep

- the current Next.js app
- the current Prisma database
- the current desktop app
- the current recruiting module
- the current chat and knowledge foundations
- the current billing, auth, and audit systems

### Add

- internal employee domain
- people operations workflow domain
- HR request domain
- people tasks domain
- internal events and reminders
- lightweight compliance domain
- broader permissions and dashboards

### Reposition

- recruiting becomes one module
- the default navigation, command center, desktop home, and product language move to internal operations

## Target domain map

Recommended module structure:

```text
modules/
  people-ops/
    actions/
    services/
    repositories/
    validators/
    permissions/
    jobs/
  employees/
    actions/
    services/
    repositories/
    validators/
    permissions/
  hr-requests/
    actions/
    services/
    repositories/
    validators/
    permissions/
    jobs/
  people-tasks/
    actions/
    services/
    repositories/
    validators/
    permissions/
    jobs/
  knowledge/
    actions/
    services/
    repositories/
    validators/
    permissions/
    jobs/
  compliance/
    actions/
    services/
    repositories/
    validators/
    permissions/
    jobs/
  checkins/
    actions/
    services/
    repositories/
    validators/
    permissions/
    jobs/
  directory/
    services/
    repositories/
    permissions/
  chat/
    services/
    tools/
    validators/
    permissions/
  desktop/
    services/
    dto/
    permissions/
  hiring/
    actions/
    services/
    repositories/
    validators/
    permissions/
  analytics/
    services/
    repositories/
  billing/
    services/
    repositories/
```

## Layer responsibilities

### UI layer

- `app/*`
- `components/*`

Responsibilities:

- rendering
- page composition
- server action entrypoints
- route handlers
- user interaction wiring

### Domain layer

- `modules/*`

Responsibilities:

- business rules
- use-case orchestration
- domain DTOs
- write policies
- read models
- automation triggers

### Infrastructure layer

- `lib/*`

Responsibilities:

- Prisma
- auth plumbing
- storage
- email
- OpenAI client
- observability
- low-level helpers

## Foundational business objects

The internal operations platform should be built around these first-class entities.

### Employee

Purpose:

- canonical internal person record

Why it matters:

- internal operations cannot depend only on `User` or recruiting entities

Suggested fields:

- organizationId
- linkedUserId nullable
- sourceApplicationId nullable
- fullName
- preferredName nullable
- workEmail
- personalEmail nullable
- phone nullable
- title
- department
- managerEmployeeId nullable
- location
- employmentType
- status
- startDate
- endDate nullable
- avatarUrl nullable

### People workflow

Purpose:

- reusable lifecycle process engine

Use cases:

- onboarding
- offboarding
- probation follow-up
- future internal process packs

Suggested entities:

- `PeopleWorkflowTemplate`
- `PeopleWorkflowTemplateStep`
- `PeopleWorkflowRun`
- `PeopleWorkflowStep`

### People task

Purpose:

- operational execution layer for internal work

Suggested entities:

- `PeopleTask`
- `PeopleTaskComment`

Suggested fields:

- organizationId
- title
- description nullable
- assigneeUserId nullable
- assigneeEmployeeId nullable
- relatedEmployeeId nullable
- sourceType
- sourceId nullable
- priority
- status
- dueAt nullable
- completedAt nullable

### HR request

Purpose:

- internal service desk and queue management

Suggested entities:

- `HrRequest`
- `HrRequestComment`
- `HrRequestSlaEvent`

Suggested fields:

- organizationId
- requesterEmployeeId nullable
- requesterUserId nullable
- assigneeUserId nullable
- title
- description
- category
- priority
- status
- slaStatus
- dueAt nullable
- firstResponseAt nullable
- resolvedAt nullable

### Internal event

Purpose:

- shared operational event and reminder model

Use cases:

- onboarding session
- check-in
- initial evaluation
- policy reminder
- exit interview

Suggested entities:

- `PeopleEvent`
- `PeopleReminder`

### Compliance item

Purpose:

- lightweight internal compliance visibility

Suggested entities:

- `ComplianceRequirement`
- `ComplianceRecord`
- `PolicyAcknowledgement`

## Product modules and what they should solve

### 1. People Ops Hub

This becomes the operational center for HR.

Includes:

- onboarding
- offboarding
- people tasks
- internal events
- lightweight compliance

Primary job to be done:

- reduce repetitive coordination work and give HR a live view of operational execution

### 2. Employee Management

This becomes the internal system of record for people operations.

Includes:

- employee directory
- employee profile
- manager relationships
- org chart
- status and lifecycle visibility
- check-ins and operational notes

Primary job to be done:

- make each employee legible inside the operating system

### 3. Internal RH Service Desk

This becomes the intake and workflow layer for internal HR support.

Includes:

- requests
- queue view
- SLA visibility
- assignee ownership
- comments and history

Primary job to be done:

- centralize internal HR demand and prevent work from getting lost

### 4. Knowledge Base

This becomes the document and policy operating layer.

Includes:

- policies
- FAQs
- playbooks
- manuals
- manager guides
- PDFs and uploaded documents

Primary job to be done:

- make internal policy and process knowledge searchable, governable, and assistant-ready

### 5. Company Chat

This becomes the internal operations copilot.

Primary job to be done:

- help users understand status, locate information, and trigger assisted actions across internal operations

### 6. Desktop Operations App

This becomes the daily cockpit for internal operations.

Primary job to be done:

- reduce tab-hopping and put priority work, alerts, quick actions, and approvals in one place

### 7. Hiring module

This stays in the product, but should sit under the broader operating system.

Primary job to be done:

- support recruiting when needed and connect hires into employee onboarding

## Navigation target

Recommended top-level web structure:

- `/dashboard`
- `/people/command-center`
- `/people/onboarding`
- `/people/offboarding`
- `/people/tasks`
- `/people/calendar`
- `/employees`
- `/employees/[employeeId]`
- `/requests`
- `/knowledge`
- `/chat`
- `/hiring/jobs`
- `/hiring/candidates`
- `/hiring/pipeline`
- `/hiring/interviews`
- `/analytics`
- `/settings`

Recommended nav grouping:

- Home
- People Ops
- Employees
- Service Desk
- Knowledge
- Company Chat
- Hiring
- Analytics
- Billing and Settings

This change is important because it makes hiring visibly subordinate to internal operations.

## Dashboard architecture

### HR Command Center

Purpose:

- primary operational surface for HR and people ops

Should show:

- open requests
- overdue people tasks
- onboarding in progress
- offboarding in progress
- pending documents
- events today
- SLA risk
- compliance alerts
- assistant highlights

### People Ops Dashboard

Purpose:

- summarized operational health view

Should show:

- new employees in onboarding
- active offboarding cases
- request volume
- average resolution time
- SLA at risk
- compliance backlog
- blocked ownership areas

### Employee Profile

Purpose:

- operational source of truth for one employee

Should show:

- identity and role
- manager and team
- location and status
- lifecycle status
- tasks
- requests
- documents
- check-ins
- feedback and notes when allowed

## Permission model

Recommended role expansion:

- OWNER
- ADMIN
- PEOPLE_ADMIN
- PEOPLE_OPS
- MANAGER
- EMPLOYEE
- RECRUITER
- HIRING_MANAGER

Recommended capability families:

- `people.view`
- `people.manage`
- `employees.view`
- `employees.manage`
- `requests.view`
- `requests.manage`
- `tasks.view`
- `tasks.manage`
- `knowledge.view`
- `knowledge.manage`
- `compliance.view`
- `compliance.manage`
- `chat.use`
- `hiring.view`
- `hiring.manage`
- `analytics.view`
- `billing.manage`

## Company chat tool strategy

Recommended internal tool surface:

- `search_employees`
- `get_employee_profile`
- `search_hr_requests`
- `create_hr_request`
- `update_hr_request`
- `search_people_tasks`
- `create_people_task`
- `update_people_task`
- `search_knowledge`
- `create_onboarding_plan`
- `create_offboarding_plan`
- `get_people_dashboard`
- `get_compliance_summary`
- `draft_internal_announcement`
- `draft_policy_response`
- `search_candidates`
- `search_jobs`

Rules:

- every tool is organization-scoped
- every write checks permissions
- every write is validated with Zod
- every write creates audit events when relevant
- the assistant suggests and assists, rather than silently mutating critical records

## Desktop architecture

Keep `apps/desktop` as a dedicated product surface.

Target desktop home:

- executive operational home
- inbox
- quick actions
- pending tasks
- pending requests
- events today
- approvals
- company chat
- settings

Recommended desktop backend surface:

- `GET /api/v1/desktop/bootstrap`
- `GET /api/v1/desktop/inbox`
- `GET /api/v1/desktop/tasks`
- `GET /api/v1/desktop/requests`
- `GET /api/v1/desktop/events`
- `GET /api/v1/desktop/approvals`
- `GET /api/v1/desktop/chat/*`
- `POST /api/v1/desktop/chat/actions`
- `POST /api/v1/desktop/quick-actions/*`

## Async jobs

Extend the current runtime with internal operations jobs:

- notifications
- reminders
- knowledge ingestion
- automatic summaries
- checklist generation
- SLA alerts
- compliance alerts
- AI processing
- emails

Recommended additional job types:

- `ONBOARDING_PLAN_GENERATE`
- `OFFBOARDING_PLAN_GENERATE`
- `PEOPLE_REMINDER`
- `HR_REQUEST_SLA_ALERT`
- `COMPLIANCE_ALERT`
- `INTERNAL_SUMMARY_BUILD`
- `KNOWLEDGE_EMBED`
- `PEOPLE_TASK_AUTOCREATE`

## Delivery phases

### Phase 1: internal operations foundation

- add employee domain
- add workflow template and workflow run primitives
- add people tasks
- add permission expansion
- add base read models for command center

### Phase 2: people ops core

- onboarding
- offboarding
- internal events
- compliance visibility

### Phase 3: employee management

- directory
- employee profile
- org chart
- check-ins and operational notes

### Phase 4: internal RH service desk

- requests
- comments
- queue view
- SLA tracking
- requester view

### Phase 5: assistant and knowledge integration

- assistant tools for employees, requests, tasks, and compliance
- knowledge retrieval improvements
- communication drafting

### Phase 6: desktop expansion

- tasks
- requests
- events
- approvals
- internal ops home

### Phase 7: product rebalancing

- navigation rewrite
- dashboard rewrite
- recruiting moved under `Hiring`
- docs, env, scripts, and setup review

## First implementation recommendation

The first implementation slice should create immediate day-to-day value for companies that are not hiring heavily:

1. Employee domain
2. People tasks
3. Onboarding and offboarding workflow runs
4. Internal HR requests
5. HR Command Center

That slice gives the platform a real internal operations center and creates the data foundation that chat, desktop, compliance, and hiring integration can build on next.
