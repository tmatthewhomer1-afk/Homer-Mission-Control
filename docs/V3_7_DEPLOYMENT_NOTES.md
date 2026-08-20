# V3.7 Deployment Notes

V3.7 adds the Live Briefing Dashboard to Homer Mission Control.

## Included
- Browser-based live weather via Open-Meteo
- Daily headline categories with save/hide controls
- Public headline JSON feed refreshed by GitHub Actions
- Calendar placeholder for secure Google Calendar integration in V3.8
- V3.6 weekly-plan behavior preserved

## Privacy
No Google Calendar credentials or private calendar data are stored in the public repository.

## Deployment gate
The pull request must pass `.github/workflows/validate.yml` before merge.
