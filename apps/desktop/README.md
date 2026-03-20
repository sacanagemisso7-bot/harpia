# HireFlow Desktop

Desktop client foundation for people ops, RH, managers, founders, and internal operations teams, with hiring preserved as a complementary module.

## Scope of this phase

- premium shell
- operational home
- operational inbox
- people tasks queue
- internal requests queue
- people calendar and events
- quick actions
- company chat surface
- desktop login against the HireFlow backend
- command palette scaffold
- notification center scaffold
- Tauri structure ready for future auto-update and notifications

## Run locally

1. Start the web app in the repository root with `npm run dev`
2. Install desktop dependencies with `npm --prefix apps/desktop install`
3. Run the desktop web shell with `npm run desktop:dev`
4. When the Tauri toolchain is available, run `npm run desktop:tauri`

The desktop client authenticates and syncs through:

- `POST /api/v1/desktop/session`
- `GET /api/v1/desktop/bootstrap`
- `GET /api/v1/desktop/inbox`
- `GET /api/v1/desktop/tasks`
- `GET /api/v1/desktop/requests`
- `GET /api/v1/desktop/events`
- `GET /api/v1/desktop/chat/threads`
- `POST /api/v1/desktop/chat/messages`
- `POST /api/v1/desktop/chat/actions`

The default local API base is `http://127.0.0.1:3000`.

## Next iterations

- add native notifications
- add desktop approvals and richer local actions
- add native deep links into detailed workspace screens
- enrich multi-org switching for the desktop shell
