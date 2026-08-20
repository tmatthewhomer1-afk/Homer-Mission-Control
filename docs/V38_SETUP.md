# Homer Mission Control V3.8 — Secure Sync Setup

## Goal
Move private Mission Control state out of browser-only localStorage while preserving local fallback.

## Supabase
1. Create/sign in to Supabase and create a project.
2. Run `supabase/schema.sql` in the Supabase SQL Editor.
3. Enable an authentication method for the Mission Control user (email magic link is the simplest first option).
4. Copy the project URL and server-only service role key into Vercel environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
5. Never put the service role key in `index.html`, `v38.js`, GitHub Actions logs, or any browser bundle.

## Vercel
Create a project for this repository/branch and add the environment variables above. The V3.8 API endpoints are:
- `GET /api/health` — safe configuration status only; never returns secrets.
- `GET /api/sync` — returns the authenticated user's saved Mission Control state.
- `PUT /api/sync` — upserts the authenticated user's Mission Control state.

Both sync operations require `Authorization: Bearer <supabase-access-token>`.

## Google Calendar (next phase)
Add only server-side environment variables when OAuth is implemented:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`

Calendar tokens must be encrypted/stored server-side and never committed to the public repo.

## Client migration plan
1. Keep current localStorage as offline fallback.
2. Add Supabase Auth client using only the public project URL + publishable/anon key.
3. On login, compare cloud `updatedAt` with local state and require a deliberate merge rule.
4. Save dashboard changes to localStorage immediately, then debounce cloud sync.
5. Surface a small status indicator: Local / Syncing / Synced / Offline.

## Privacy boundary
Public GitHub source may contain only public configuration such as the Supabase project URL and browser-safe publishable/anon key. Server secrets belong only in Vercel environment variables.
