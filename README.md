# Homer Mission Control

Homer Mission Control is a personal command-center dashboard for organizing and acting on work across NTCC, First Baptist Church Kosse, and personal/family responsibilities.

## Current status

The working prototype is **V3.5**, currently maintained as a standalone HTML/CSS/JavaScript dashboard. GitHub is now the source-of-truth for development and version history.

## Core workflow

Mission Control is designed around five task states:

- **NOW** — current focus
- **NEXT** — active, but not today's focus
- **WAITING** — blocked by another person, event, or decision
- **LATER** — intentionally deferred
- **COMPLETE** — finished

The dashboard also includes Quick Capture, a Mission Briefing, NTCC schedule/calendar context, church work areas, and ChatGPT prompt-building actions.

## Development roadmap

### Phase 1 — GitHub foundation
- Put the current dashboard under version control
- Establish a stable `main` branch
- Document the operating model
- Use branches/pull requests for larger upgrades

### Phase 2 — Live dashboard
- Publish Mission Control to a secure web host
- Stop relying on a file in Downloads
- Preserve access from desktop and mobile

### Phase 3 — Persistent cloud data
- Replace browser-only localStorage with a secure persistent data store
- Keep tasks synchronized across devices
- Add backup/restore safeguards

### Phase 4 — Assistant workflow
- Add a Weekly Plan panel
- Add structured ChatGPT plan import/apply workflow
- Turn recommendations into dashboard actions
- Add decision-needed and overdue handling

### Phase 5 — Connected Mission Control
- Connect appropriate calendar, email, and document workflows
- Add secure backend/API functionality
- Expand agent-assisted actions where practical and safe

## Project principle

The dashboard should stay simple enough to use every day. New features should reduce friction, not create another system to maintain.
