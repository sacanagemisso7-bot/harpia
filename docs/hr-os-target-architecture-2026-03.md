# HireFlow AI HR OS Target Architecture

Date: 2026-03-18

## Product north star

Evolve HireFlow from an AI recruiting platform into a premium HR Operating System that becomes the operational core for modern HR teams.

The product must feel indispensable because it helps teams:

- hire
- onboard
- operate
- support employees
- keep process visibility
- reduce repetitive coordination work
- act through a grounded AI copilot

## Non-goals

This phase should not turn HireFlow into:

- payroll software
- a generic ERP
- legal advisory software
- a full enterprise performance management suite

The focus stays on operations, process visibility, task orchestration, and productivity.

## Pillar architecture

### 1. Recruiting OS

Keep and strengthen:

- jobs
- candidates
- applications
- pipeline
- interviews
- analytics
- communications
- careers page
- billing
- team and roles
- audit trail

### 2. People Ops Hub

Add as a new first-class product area:

- onboarding
- offboarding
- HR requests
- people tasks
- internal HR calendar
- check-ins
- pulse
- directory and org chart
- compliance

### 3. Company Chat

Expand from recruiting copilot to HR operating copilot:

- read across all pillars
- suggest next steps
- create and update operational records
- summarize risks and backlog
- draft internal communications

### 4. Desktop Productivity App

Expand from recruiting desktop shell to daily HR cockpit:

- operational inbox
- quick actions
- task and request awareness
- onboarding and offboarding notifications
- events of the day
- always-available company chat

## Incremental architecture strategy

### Keep

- the current Next.js app
- the current Prisma database
- the current `lib/*` infrastructure helpers
- the current desktop app
- the current recruiting routes and flows

### Change

- all new HR OS work lands in `modules/*`
- route files become thinner over time
- shared workflow primitives power multiple People Ops modules
- desktop and chat consume domain services instead of ad hoc page logic

### Migrate only when touched

Do not pause delivery for a large refactor. Existing recruiting flows stay as they are unless they need to integrate with the new People Ops layer.

## Target folder shape

```text
app/
  (app)/
    dashboard/
    jobs/
    candidates/
    pipeline/
    interviews/
    people/
      command-center/
      onboarding/
      offboarding/
      requests/
      tasks/
      calendar/
      check-ins/
      pulse/
      directory/
      compliance/
      employees/[employeeId]/
    chat/
    knowledge/
    settings/
  api/
    v1/
      desktop/
      people/
      chat/

modules/
  recruiting/
    actions/
    services/
    repositories/
    validators/
    policies/
  people/
    services/
    repositories/
    validators/
    policies/
  people-processes/
    services/
    repositories/
    validators/
  onboarding/
    services/
    jobs/
  offboarding/
    services/
    jobs/
  hr-requests/
    services/
    repositories/
    validators/
    jobs/
  people-tasks/
    services/
    repositories/
    validators/
    jobs/
  directory/
    services/
    repositories/
  checkins/
    services/
    repositories/
    validators/
    jobs/
  pulse/
    services/
    repositories/
    validators/
    jobs/
  compliance/
    services/
    repositories/
    jobs/
  knowledge/
  company-chat/
  ai/
  desktop/
  analytics/
  billing/

lib/
  prisma/
  auth/
  audit/
  email/
  storage/
  observability/
  calendar/
```

## Layer model

### Route and UI layer

- `app/*`
- `components/*`

Responsibilities:

- pages and layouts
- route handlers
- form wiring
- server action entrypoints
- DTO to UI rendering

### Domain layer

- `modules/*`

Responsibilities:

- use-cases
- orchestration
- business rules
- domain DTOs
- policies
- async workflow triggers

### Infrastructure layer

- `lib/*`

Responsibilities:

- Prisma client
- auth/session plumbing
- email transport
- file storage
- OpenAI client
- observability adapters
- low-level helpers

## Core data model additions

The HR OS phase needs a canonical people model.

### Canonical employee layer

Add an `Employee` domain that is separate from `User`.

Reason:

- not every employee is a full system user
- recruiting outcomes must become employee records
- manager relationships and employee lifecycle data belong here

Recommended entities:

- `Employee`
- `EmployeeEmployment`
- `EmployeeRelationship`
- `EmployeeDocument`

Minimum fields to cover first release:

- organizationId
- linkedUserId nullable
- fullName
- workEmail
- personalEmail nullable
- title
- department
- managerEmployeeId nullable
- location
- employmentType
- status
- startDate
- endDate nullable
- sourceApplicationId nullable

### Shared workflow engine for people operations

Do not duplicate onboarding and offboarding logic. Model them as product modules on top of shared workflow primitives.

Recommended entities:

- `PeopleWorkflowTemplate`
- `PeopleWorkflowTemplateStep`
- `PeopleWorkflowRun`
- `PeopleWorkflowStep`

Use these to power:

- onboarding
- offboarding
- recurring follow-up packs later

### HR requests

Recommended entities:

- `HrRequest`
- `HrRequestComment`
- `HrRequestWatcher`
- `HrRequestSlaEvent`

Core fields:

- category
- priority
- status
- requesterEmployeeId
- assigneeUserId nullable
- dueAt nullable
- slaStatus
- source

### People tasks

Recommended entities:

- `PeopleTask`
- `PeopleTaskComment`

Core fields:

- assigneeUserId nullable
- assigneeEmployeeId nullable
- sourceType
- sourceId nullable
- priority
- dueAt
- status
- completedAt nullable

### Calendar and events

Recommended entities:

- `PeopleEvent`
- `PeopleReminder`

Examples:

- onboarding session
- probation review reminder
- exit interview
- missing document follow-up
- check-in reminder

### Check-ins and feedback

Recommended entities:

- `CheckIn`
- `CheckInParticipant`
- `CheckInFollowUp`

Keep it lightweight and operational.

### Pulse

Recommended entities:

- `PulseSurvey`
- `PulseQuestion`
- `PulseResponse`
- `PulseAggregation`

Keep the survey system intentionally lean.

### Compliance

Recommended entities:

- `ComplianceRequirement`
- `ComplianceRecord`
- `PolicyAcknowledgement`

This supports:

- pending documents
- policy acceptance
- critical operational gaps
- auditable visibility

## Recruiting-to-People Ops integration

This is the most important product bridge.

When a candidate becomes a hire:

1. create or confirm the `Employee` record
2. link the employee to the source application
3. generate onboarding workflow run from template
4. create initial People Tasks
5. schedule initial People Events
6. create compliance requirements
7. surface the new work in dashboards, inbox, chat, and desktop

When a departure is initiated:

1. create offboarding workflow run
2. create tasks for HR, manager, IT, and employee
3. create exit interview event
4. track access, equipment, and documents
5. raise overdue or blocked items into command center

## Navigation target

Keep existing recruiting URLs stable.

Add a new People area:

- `/people/command-center`
- `/people/onboarding`
- `/people/offboarding`
- `/people/requests`
- `/people/tasks`
- `/people/calendar`
- `/people/check-ins`
- `/people/pulse`
- `/people/directory`
- `/people/compliance`
- `/people/employees/[employeeId]`

Recommended primary nav groups:

- Command Center
- Recruiting
- People Ops
- Knowledge
- Company Chat
- Analytics
- Billing and Settings

## Dashboard architecture

### HR Command Center

Purpose: daily action surface for HR operations.

Should aggregate:

- active hires in progress
- onboarding items due soon
- offboarding blockers
- open HR requests
- SLA risk
- overdue people tasks
- events today
- copilot alerts

### People Ops Dashboard

Purpose: manager and exec visibility.

Should aggregate:

- onboarding volume
- offboarding volume
- request resolution time
- pending documents
- missing check-ins
- pulse warning signs
- backlog concentration by owner or manager

### Employee Profile

Purpose: operational source of truth for one employee.

Should show:

- profile summary
- org placement
- manager
- employment status
- onboarding and offboarding status
- tasks
- requests
- check-ins
- documents
- compliance items
- notes when permission allows

## Permission model

The current matrix should evolve in two steps.

### Step 1: add roles

Recommended new roles:

- PEOPLE_ADMIN
- PEOPLE_OPS
- EMPLOYEE

Keep:

- OWNER
- ADMIN
- RECRUITER
- HIRING_MANAGER

### Step 2: expand capabilities

Recommended permission families:

- `recruiting.view`
- `recruiting.manage`
- `people.view`
- `people.manage`
- `people.manage_onboarding`
- `people.manage_offboarding`
- `people.manage_requests`
- `people.manage_tasks`
- `people.view_directory`
- `knowledge.manage`
- `chat.use`
- `analytics.view`
- `compliance.view`
- `billing.manage`

This keeps the platform flexible without overloading role logic.

## Company chat architecture

The assistant should become a tool-driven HR copilot with strict org and permission boundaries.

Recommended tool set:

- `search_candidates`
- `search_jobs`
- `search_applications`
- `get_candidate_profile`
- `get_pipeline_snapshot`
- `search_knowledge`
- `create_note`
- `move_stage`
- `schedule_interview`
- `create_onboarding_plan`
- `create_offboarding_plan`
- `search_employees`
- `get_employee_profile`
- `create_hr_request`
- `update_hr_request`
- `search_hr_requests`
- `create_people_task`
- `update_people_task`
- `get_people_dashboard`
- `get_compliance_summary`
- `get_pulse_summary`
- `draft_internal_announcement`
- `draft_policy_response`

Tool design rules:

- every tool is organization-scoped
- every write action checks permissions
- every write action emits audit events
- every write payload uses Zod validation
- chat actions remain assisted, not silent destructive automation

## Desktop architecture

Keep `apps/desktop` as a separate app.

Expand backend surface:

- `GET /api/v1/desktop/bootstrap`
- `GET /api/v1/desktop/inbox`
- `GET /api/v1/desktop/events`
- `GET /api/v1/desktop/tasks`
- `GET /api/v1/desktop/requests`
- `GET /api/v1/desktop/chat/*`
- `POST /api/v1/desktop/chat/actions`
- `POST /api/v1/desktop/quick-actions/*`

Desktop home should evolve into:

- HR inbox
- today events
- overdue tasks
- pending requests
- onboarding and offboarding alerts
- company chat rail
- quick action launcher

## Background jobs and automations

Extend the existing runtime instead of replacing it.

Recommended additional job types:

- `ONBOARDING_PLAN_GENERATE`
- `OFFBOARDING_PLAN_GENERATE`
- `PEOPLE_REMINDER`
- `HR_REQUEST_SLA_CHECK`
- `CHECKIN_NUDGE`
- `PULSE_AGGREGATE`
- `KNOWLEDGE_EMBED`
- `OPERATIONS_SUMMARY_BUILD`
- `COMPLIANCE_ALERT_BUILD`

Recommended automation triggers:

- hire confirmed
- employee start date approaching
- offboarding scheduled
- HR request unanswered
- document pending
- missing early check-in
- manager inactivity
- backlog threshold exceeded

## Delivery phases

### Phase 1: foundation for People Ops

- add employee domain
- add workflow templates and runs
- add people task domain
- add onboarding and offboarding shells
- add permission expansion

### Phase 2: operational execution

- add HR requests
- add people events and reminders
- add employee profile
- add command center and people dashboard
- connect recruiting hiring outcomes to onboarding

### Phase 3: assistant expansion

- add people ops chat tools
- add HR summary and compliance tools
- add policy response and announcement drafting

### Phase 4: desktop expansion

- add people ops desktop inbox
- add task, request, and event surfaces
- add quick actions for HR operations

### Phase 5: polish and hardening

- review navigation and naming consistency
- review env and scripts
- fill audit coverage gaps
- improve setup docs
- add more tests around permissions and automations

## First implementation recommendation

The first code phase should build the smallest coherent People Ops slice that already reduces repetitive HR work:

1. Employee
2. Workflow templates and runs
3. Onboarding
4. Offboarding
5. People tasks
6. HR Command Center

That slice immediately creates value on its own and gives Company Chat and Desktop something real to read and act on.
