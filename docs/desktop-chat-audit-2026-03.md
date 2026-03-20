# Desktop + Company Chat Audit

Date: 2026-03-18

## What already exists and can be reused

### For desktop

- `app/api/v1/desktop/bootstrap` already exposes a first overview payload
- `app/api/v1/desktop/inbox` already exposes operational inbox data
- `modules/recruiting-ops/queries.ts` is reusable for desktop inbox
- `lib/dashboard/queries.ts` already provides executive metrics
- `lib/auth/current-user.ts` and org membership logic already model the active workspace correctly
- visual language from `app/globals.css`, `components/ui/*`, `components/layout/*`, and `components/layout/app-shell.tsx` is reusable as design direction

### For company chat

- `modules/company-chat/tools.ts` already reaches core recruiting data
- `modules/company-chat/service.ts` already persists threads/messages and proposes actions
- `app/(app)/chat/page.tsx` already gives a first premium chat workspace
- knowledge base exists and can already feed retrieval
- inbox, analytics, interviews, applications, candidates, jobs, templates, and knowledge are all queryable from Prisma

## Current gaps

### Desktop gaps

- desktop app is still a static shell, not a live operational client
- there is no dedicated desktop session/auth flow yet
- no typed desktop SDK/client
- no desktop chat API surface yet
- no command palette / launcher behavior
- no notification center model
- no keyboard-ready app state

### Chat gaps

- current tools are useful but not explicitly surfaced in the UI
- related context rail is still thin
- email drafting and interview scheduling are not yet exposed as first-class proposals
- there is no stronger breakdown view for score explanation
- threads are good, but the product still needs more "OS-like" affordances than a standard message list

## Architecture direction for this phase

### Desktop

- keep `apps/desktop` as a separate Tauri app
- do not migrate the whole repo into monorepo/workspaces yet
- add a lightweight desktop auth/session token flow in the web backend
- add typed JSON endpoints for desktop home, inbox, interviews, chat, and quick actions
- add a small desktop API client that consumes those endpoints

### Company chat

- keep web chat in the main Next app
- make the assistant explicitly tool-driven
- persist tool traces and action proposals in message metadata
- expose richer tools:
  - score breakdown
  - job summary
  - draft email
  - schedule interview
  - shortlist save
- improve the UI with:
  - tool trace pills
  - action proposal cards
  - context rail
  - assistant-generated artifacts

## Product stance

The desktop should feel like an operational cockpit, not a browser wrapper.

The chat should feel like a recruiting copilot with:

- memory
- retrieval
- grounded answers
- operational suggestions
- assisted execution
