# Homer Mission Control V3.8 — Secure Sync Setup

## Goal
Move private Mission Control state out of browser-only localStorage while preserving local fallback.

## Supabase
The connected Supabase project is live and the `mission_control_state` table has been deployed with Row Level Security.

Browser authentication uses:
- the public Supabase project URL
- a browser-safe publishable key
- the signed-in user's Supabase session

The browser never receives a secret/service-role key. Each user can read, insert, and update only the row whose `user_id` matches their authenticated identity.

### Authentication
V3.8 starts with email magic-link sign-in. Before production use, configure Supabase Auth URL settings so the Mission Control Pages URL is an allowed redirect:

`https://tmatthewhomer1-afk.github.io/Homer-Mission-Control/`

## First-sync safety
Cloud synchronization is intentionally manual in the first V3.8 release:
- **Push This Device → Cloud** uploads the current browser snapshot after confirmation.
- **Pull Cloud → This Device** downloads the cloud snapshot after confirmation.
- Before a pull overwrites local data, Mission Control stores a safety copy in `homerPreCloudPullBackupV38`.

The synced snapshot includes tasks, weekly plan, saved headlines, and hidden headlines. Browser weather coordinates remain local-only.

## Vercel
Vercel remains the secure backend target for features that require server secrets, especially Google Calendar and future OpenAI-powered Mission Control actions.

The V3.8 API endpoints prepared in this branch are:
- `GET /api/health` — safe configuration status only; never returns secrets.
- `GET /api/sync` — authenticated state retrieval.
- `PUT /api/sync` — authenticated state upsert.

The sync API uses the Supabase publishable key plus the caller's validated user token so database RLS remains the authorization boundary.

## Google Calendar (next phase)
Add only server-side environment variables when OAuth is implemented:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`

Calendar tokens must be encrypted/stored server-side and never committed to the public repo.

## Privacy boundary
Public GitHub source may contain only public configuration such as the Supabase project URL and browser-safe publishable key. Google OAuth secrets, OpenAI API keys, Supabase secret keys, and private Mission Control data must never be committed to the public repository.
