# Homer Mission Control V3.8 — Secure Sync Setup

## Goal
Move private Mission Control state out of browser-only localStorage while preserving local fallback.

## Supabase
The production Supabase project is configured with:
- `public.mission_control_state`
- Row Level Security enabled
- per-user SELECT / INSERT / UPDATE policies
- authenticated-role table grants
- browser-safe publishable key only in the client

The GitHub Pages URL has been added to Supabase Auth URL Configuration for magic-link redirects.

## Cloud sync behavior
V3.8 intentionally starts with manual sync controls:
- **Push This Device → Cloud** saves the current device state.
- **Pull Cloud → This Device** creates a safety backup first, then replaces local synced state.
- Tasks, weekly plan, and headline preferences are included.
- Weather coordinates remain local-only.

This manual-first model prevents an empty or stale browser from silently overwriting a good dashboard during the initial migration.

## Authentication
Mission Control uses Supabase email magic-link authentication. The browser uses only:
- Supabase project URL
- Supabase publishable key
- authenticated user session

No secret/service-role key is exposed in the browser or required for normal cloud state sync.

## Vercel / server API
The repository retains a Vercel-ready API skeleton for later server-side integrations such as Google Calendar and protected automation endpoints. Normal Mission Control cloud-state sync is enforced directly by Supabase RLS and does not require a privileged database key.

## Google Calendar (next phase)
When OAuth is implemented, keep these server-side only:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`

Calendar refresh/access tokens must never be committed to the public repository.

## Release gate
Before merging:
1. GitHub CI must pass.
2. Supabase Auth redirect must point to the Mission Control site.
3. After deployment, complete a magic-link sign-in.
4. Use **Push This Device → Cloud** first from the browser that contains the authoritative task list.
5. Verify a Pull on a second/clean browser only after the first cloud push succeeds.
