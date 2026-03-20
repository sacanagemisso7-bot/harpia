# Desktop + Company Chat Target Architecture

Date: 2026-03-18

## Goal

Create a premium operational desktop client and a genuinely useful company chat without replacing the existing web app.

## Desktop architecture

### Surfaces

- `apps/desktop`: Tauri + React client
- `app/api/v1/desktop/*`: typed backend surface for the desktop app

### Backend responsibilities

- validate desktop session token
- resolve active organization and permissions
- return compact DTOs for:
  - shell bootstrap
  - inbox
  - interviews today
  - quick actions
  - company chat threads/messages

### Client responsibilities

- login flow
- shell navigation
- stateful workspace views
- command palette / quick launcher
- notification center scaffolding
- embedded company chat

## Company chat architecture

### Data model

- `ChatThread`
- `ChatMessage`
- `KnowledgeDocument`
- `KnowledgeChunk`
- `SavedShortlist`

### Runtime

- message in
- build organization context
- call internal tools
- optional OpenAI synthesis
- persist assistant response, related entities, tool traces, and action proposals

### UI model

- left rail: threads
- center: conversation
- right rail: context, suggested artifacts, tool traces
- bottom: composer and quick prompts

## Incremental delivery

### Step 1

- add desktop auth/session and typed endpoints
- make desktop consume real backend data

### Step 2

- expand tool-driven company chat
- expose tool traces and richer action proposals

### Step 3

- refine desktop UX with command palette, notifications rail, and contextual side panel
