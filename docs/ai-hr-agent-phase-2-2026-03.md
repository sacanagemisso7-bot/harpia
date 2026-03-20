# AI HR Agent Phase 2

## Objective

Transform HireFlow from a strong internal operations platform with chat assistance into a real AI HR agent that can:

- understand operational HR requests
- retrieve company context and policy knowledge
- reason over people ops state
- propose the next best action
- execute approved actions across systems
- monitor outcomes and reopen work when needed

The target is not "AI chat about HR".
The target is "AI operational execution layer for HR, People Ops, managers, and internal operations".

## What already exists

The current base already provides the right platform foundation:

- employee, onboarding, offboarding, people tasks, HR requests, compliance, events, and check-ins
- command center and people ops dashboard surfaces
- company chat with internal tools and assisted actions
- native desktop app with operational home, inbox, tasks, requests, events, and chat
- permissions, audit, background jobs, billing, and multi-org support
- hiring preserved as a complementary module

This means Phase 2 should not restart or replace anything.
It should add the agent execution layer on top of the current domains.

## What is still missing for a complete AI HR agent

### 1. Multi-step orchestration

The assistant can answer and trigger actions, but it still lacks a durable execution model for:

- plan -> validate -> ask for missing info -> request approval -> execute -> monitor

### 2. Approval and trust layer

Sensitive actions still need a stronger framework for:

- approval requests
- dry-run summaries
- execution previews
- reversible or compensating actions where possible
- explicit policy guardrails

### 3. External system execution

Without external integrations, the agent can coordinate work but not fully close the loop.
Key missing connectors are:

- Google / Microsoft calendar
- email delivery for internal communication
- Slack / Teams
- document / signature tooling
- identity or provisioning systems

### 4. Policy-grade retrieval and reasoning

The knowledge base is ready for ingestion, but the agent still needs:

- cited policy answers
- ambiguity handling
- policy-aware drafts
- manager-safe and employee-safe answer modes

### 5. Proactive operation

The current system is strong when asked.
A complete HR agent must also detect and act on:

- SLA risk
- onboarding blockage
- missing feedback
- overdue compliance
- missing manager action
- request backlog spikes

### 6. Self-service execution

Employees and managers should be able to resolve many HR flows through the agent without routing everything manually to RH.

## Product definition for Phase 2

The AI HR agent should support 4 operating modes:

### A. Answer mode

- answer policy questions
- explain status and process
- summarize employee context
- show pending tasks, requests, and risks

### B. Copilot mode

- generate checklist
- draft communications
- suggest next steps
- summarize backlog
- recommend escalation

### C. Agent mode

- create tasks, requests, notes, onboarding plans, offboarding plans, and events
- update statuses
- chase pending owners
- open approvals
- coordinate multi-step workflows

### D. Watchtower mode

- monitor SLAs and bottlenecks
- detect operational drift
- create reminders and escalations
- surface risks proactively in desktop, inbox, and command center

## Phase 2 architecture

## New modules

Recommended additions:

- `modules/ai-agent`
- `modules/agent-approvals`
- `modules/policy-assistant`
- `modules/integrations`
- `modules/automation-rules`
- `modules/notifications`

## Key internal concepts

### AgentRun

Represents one agent execution session.

Suggested fields:

- `id`
- `organizationId`
- `startedByUserId`
- `mode`
- `goal`
- `status`
- `riskLevel`
- `requiresApproval`
- `summary`
- `createdAt`
- `updatedAt`

### AgentStep

Represents each step inside an execution.

Suggested fields:

- `id`
- `agentRunId`
- `kind`
- `title`
- `status`
- `input`
- `output`
- `toolName`
- `startedAt`
- `completedAt`

### AgentApprovalRequest

Approval checkpoint before sensitive actions.

Suggested fields:

- `id`
- `organizationId`
- `agentRunId`
- `requestedByUserId`
- `approverUserId`
- `title`
- `summary`
- `riskLevel`
- `status`
- `payload`
- `expiresAt`

### AgentActionExecution

Ledger for actual execution of an action.

Suggested fields:

- `id`
- `organizationId`
- `agentRunId`
- `actionType`
- `targetType`
- `targetId`
- `status`
- `inputPayload`
- `resultPayload`
- `error`
- `executedAt`

## Action registry

Introduce an internal action registry instead of embedding action logic only inside chat service code.

Suggested structure:

- `modules/ai-agent/actions/registry.ts`
- `modules/ai-agent/actions/execute.ts`
- `modules/ai-agent/actions/validators.ts`
- `modules/ai-agent/policies.ts`

Benefits:

- shared by web chat, desktop chat, future Slack bot, and automations
- stronger validation
- approval-aware execution
- cleaner audit trail

## Phase 2 toolset

The next internal tools should extend what already exists:

- `answer_policy_question`
- `get_employee_timeline`
- `get_onboarding_risk_summary`
- `get_offboarding_risk_summary`
- `get_request_sla_risk`
- `get_manager_followup_gaps`
- `create_approval_request`
- `approve_agent_action`
- `draft_checkin_summary`
- `draft_manager_followup`
- `send_internal_email`
- `send_slack_message`
- `create_calendar_event_external`
- `create_document_packet`
- `request_policy_acknowledgement`
- `escalate_request_backlog`
- `generate_weekly_people_ops_summary`

All tools must continue to respect:

- organization scoping
- role permissions
- audit logging
- strong validation
- approval boundaries

## Priority roadmap

## Slice 1. Agent execution framework

Build first:

- `AgentRun`
- `AgentStep`
- `AgentApprovalRequest`
- action registry
- dry-run support
- approval-aware execution path

Why first:

- this is the minimum layer that turns the current copilot into an actual agent

## Slice 2. Policy assistant

Build next:

- semantic retrieval for policy answers
- source-cited responses
- employee-safe vs manager-safe answer modes
- `draft_policy_response`
- `draft_internal_announcement`

Why second:

- policy Q&A is one of the highest-frequency HR use cases
- it reduces repetitive internal support immediately

## Slice 3. Proactive people ops monitoring

Build next:

- SLA watcher jobs
- onboarding blocker detection
- missing check-in detection
- overdue compliance detection
- manager inactivity detection
- backlog spike detection

Outputs:

- desktop alerts
- command center alerts
- automated task creation
- approval requests for escalations

## Slice 4. External integrations

Build next:

- calendar integration
- internal email execution
- Slack / Teams notifications
- document packet generation

Why:

- this is what allows the agent to close loops rather than only create internal records

## Slice 5. Self-service flows

Build next:

- employee request intake through chat
- manager operational assistant
- employee-safe desktop/chat prompts
- request status explanations
- guided intake for vacations, benefits, documents, and policy questions

## Slice 6. Executive and admin trust layer

Build next:

- agent run history
- approval inbox
- execution ledger
- "why this happened" explanations
- agent analytics
- escalation tuning

## High-value workflows to implement first

These should become end-to-end agent flows:

### 1. New hire setup

User intent:

- "Acabamos de contratar a Ana. Prepare tudo para o onboarding."

Agent flow:

- gather missing start details
- pick onboarding template
- create run and tasks
- create internal events
- generate pending documents
- draft welcome communication
- request approval if external sends or provisioning actions are involved

### 2. Offboarding coordination

User intent:

- "Vamos desligar Pedro na sexta. Organize o processo."

Agent flow:

- create offboarding run
- create access shutdown tasks
- create document checklist
- schedule exit interview
- identify critical unresolved ownership
- alert if assets or approvals are missing

### 3. Internal request triage

User intent:

- "Classifique essa fila e destaque o que vai estourar SLA."

Agent flow:

- inspect request queue
- classify urgency
- group by category and assignee
- propose rebalancing
- create or escalate tasks
- draft internal updates

### 4. Policy response and employee self-service

User intent:

- "Como funciona a politica de trabalho hibrido?"

Agent flow:

- search policy knowledge
- answer with citations
- adapt tone for employee or manager
- offer next action if needed
- open request if the case is non-standard

### 5. Manager follow-up enforcement

User intent:

- "Quais lideres estao sem follow-up no periodo inicial?"

Agent flow:

- inspect employees in onboarding / probation
- detect missing check-ins
- identify responsible managers
- create reminder tasks
- draft manager nudges

## Background jobs for Phase 2

Add or expand jobs for:

- policy answer cache build
- SLA breach prediction
- follow-up gap detection
- onboarding blocker detection
- weekly people ops summary generation
- internal backlog anomaly detection
- approval reminder jobs
- outbound integration retries

## UI / UX surfaces to add

### Command center

Add:

- AI risk digest
- approval queue
- "agent suggested actions"
- execution history snippet

### Desktop

Add:

- approval inbox
- watchtower feed
- one-click acceptance of safe actions
- notification center with agent-origin tags

### Company chat

Add:

- plan preview
- approval request cards
- execution progress
- post-execution summaries

## Success metrics

Phase 2 should be considered successful when the product can show:

- reduced manual HR triage time
- reduced average resolution time for internal requests
- fewer overdue onboarding and offboarding items
- fewer missed manager follow-ups
- higher employee self-service resolution rate
- clear approval and audit history for agent actions

## What not to build in Phase 2

Do not turn the platform into:

- payroll
- ERP
- legal advisory software
- full enterprise performance management suite

Stay focused on:

- operations
- visibility
- workflow execution
- trusted automation
- real reduction of repetitive HR work

## Recommended implementation order in this codebase

1. `modules/ai-agent` with run/step/action abstractions
2. approval data model + approval UI cards in chat and desktop
3. policy assistant over current knowledge base
4. proactive jobs and command center alerts
5. external connectors
6. self-service intake refinement

This order builds on the current system instead of fighting it.
