# HireFlow AI Internal Operations Audit

Date: 2026-03-18

## Strategic conclusion

The current codebase is a credible enterprise SaaS foundation, but it is still organized and communicated as a recruiting-led product.

That is no longer the right center of gravity.

The product should evolve into a `People & Internal Operations OS` where the core value comes from helping companies operate people, requests, tasks, documents, policies, and internal processes every day, even when hiring volume is low.

Hiring should remain in the product, but as one module among several, not as the dominant mental model.

## What the current base already does well

The existing platform already gives us a strong operational base to build on:

- authentication and protected app areas
- multitenancy via `organizationId`
- billing and workspace management
- roles, memberships, and invites
- audit events
- background job runtime
- knowledge ingestion and retrieval-ready chunking
- company chat with persisted threads, action proposals, and tool traces
- desktop session flow and typed desktop endpoints
- modern B2B UI shell
- a complete recruiting module with real persistence and analytics

These parts should be preserved and extended, not replaced.

## What is currently misaligned with the new strategy

### 1. Product positioning is still recruiting-first

This is visible in multiple places:

- [README.md](/C:/Users/onome/agente/README.md) describes HireFlow primarily as a recruiting platform
- [app-shell.tsx](/C:/Users/onome/agente/components/layout/app-shell.tsx) brands the product as `Recruiting OS`
- [main-nav.tsx](/C:/Users/onome/agente/components/layout/main-nav.tsx) gives the primary navigation to jobs, candidates, pipeline, interviews, and recruiting operations
- dashboard and desktop bootstrap metrics are recruiting-centric

This is the clearest architectural and product problem right now. The system already has platform capabilities, but the experience still tells users that recruiting is the main job to be done.

### 2. There is no canonical internal employee domain

Today the product has:

- `User`
- organization membership
- recruiting entities such as candidate, application, interview

It does not yet have a first-class employee model for internal operations.

That blocks:

- employee profile
- directory
- org chart
- manager relationships
- employee lifecycle ownership
- onboarding and offboarding tied to a real internal record
- employee-facing request flows
- compliance tracking by employee

### 3. There is no internal service desk model

The product does not yet model internal HR requests with:

- category
- priority
- SLA
- requester
- assignee
- comment history
- queue visibility

This means the platform cannot yet act as the operational front door for internal HR work.

### 4. There is no reusable operations workflow engine

Onboarding and offboarding are not just pages. They need reusable workflow primitives:

- templates
- runs
- steps
- due dates
- ownership
- progress tracking
- reminders

The current codebase has job automation rules for hiring, but not a generic workflow layer for internal operations.

### 5. There is no internal task system

The platform does not yet have a first-class `PeopleTask` domain for operational work.

That blocks:

- HR execution tracking
- task generation from workflows
- overdue visibility
- assignee-based operational accountability
- desktop quick actions tied to real internal work

### 6. Permissions are too narrow for an internal operations platform

Current roles focus mostly on recruiting-era needs:

- OWNER
- ADMIN
- RECRUITER
- HIRING_MANAGER

The new strategy needs stronger support for:

- people ops
- HR operations
- managers
- employees in self-serve flows
- founders and executives with operational visibility

### 7. Company chat is useful, but still too tied to recruiting objects

The current assistant can already:

- search candidates
- search jobs
- search applications
- search knowledge
- move stages
- create recruiting notes
- draft email
- schedule interviews

That is a good foundation, but it is still anchored to recruiting.

For the new strategy, the assistant must become a day-to-day internal operations copilot for:

- employees
- requests
- tasks
- onboarding
- offboarding
- documents
- policies
- compliance
- events
- internal operational backlog

### 8. Desktop is a good shell, but not yet an internal operations product

The desktop app already has:

- session flow
- bootstrap API
- inbox API
- company chat integration
- operational shell layout

But it still feels like a recruiting companion. It does not yet expose the daily internal operating system for:

- pending people tasks
- open requests
- approvals
- onboarding and offboarding work
- events of the day
- internal reminders and notifications

## What should become the real center of the product

The new center of the product should be internal people operations.

That means the primary value proposition becomes:

- operate onboarding and offboarding reliably
- manage employees and internal profiles
- handle internal HR requests with SLA visibility
- keep operational tasks moving
- centralize documents and policy knowledge
- surface risks, blockers, and pending work
- let an assistant help with operational execution

This makes the software valuable even when the company is not actively hiring.

## Reclassification of existing domains

### Core platform foundations to preserve

- auth and workspace context
- billing
- audit
- knowledge ingestion
- company chat runtime
- background jobs
- desktop API surface
- shared UI shell

### New core product domains to build

- people ops
- employee management
- internal HR service desk
- people tasks
- compliance
- internal events and reminders
- check-ins and operational follow-up

### Existing domain to reposition

- hiring

Hiring remains important, but should become a complementary module that plugs into the internal operations platform instead of defining the entire product identity.

## Main architectural risks if we do not pivot cleanly

### Risk 1: the product stays valuable only during active hiring cycles

If recruiting remains the center, customers will see lower day-to-day value whenever hiring volume slows down.

### Risk 2: internal operations features become disconnected add-ons

If people ops, requests, tasks, and documents are added without a new central model, the result will feel like a bundle of side features rather than an operating system.

### Risk 3: chat and desktop will stay shallow

Without first-class internal operations data, both the assistant and the desktop experience will remain thin wrappers around recruiting workflows.

### Risk 4: navigation and product language will keep fighting the new strategy

Even if the backend evolves, the experience will continue to signal "ATS with extras" unless the shell, dashboards, and naming shift meaningfully.

## Audit conclusion

The base is strong enough to support the pivot.

The real work now is not rebuilding the stack. It is changing the product center of gravity:

1. add a first-class employee and internal operations model
2. introduce request, task, workflow, compliance, and event domains
3. reposition navigation, dashboards, chat, and desktop around internal operations
4. keep hiring as a connected module, not the main identity

That is the path from a recruiting-led SaaS to a real internal operations platform for people and process management.
