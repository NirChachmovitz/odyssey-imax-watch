# Odyssey IMAX watch

Checks whether **האודיסאה (The Odyssey)** has IMAX showtimes at **Planet Rishon LeZion**
on any date **after 2026-08-19**, and sends a phone push (via [ntfy](https://ntfy.sh)) when it does.

Runs entirely on **GitHub Actions** on a schedule — no server, no computer needed.

## How it works
- [`check.mjs`](check.mjs) hits Planet/Cineworld's public JSON API for cinema `1072`, filters for
  the Odyssey film (`filmId` starts `7460s2r`) with the `imax` attribute on dates past the threshold.
- On a hit → POSTs an urgent notification to your ntfy topic (with the booking link).
- [`.github/workflows/odyssey.yml`](.github/workflows/odyssey.yml) runs it every ~15 minutes.

## Setup
1. Set the repo secret **`NTFY_TOPIC`** to your ntfy topic (Settings → Secrets and variables → Actions).
2. That's it — the schedule runs automatically. Trigger a manual run from the **Actions** tab
   (**Run workflow**) to test.

## Config (env in the workflow)
| var | default | meaning |
|-----|---------|---------|
| `NTFY_TOPIC` | *(secret)* | ntfy topic to push to |
| `THRESHOLD` | `2026-08-19` | alert on show dates strictly after this |
| `CINEMA` | `1072` | Planet Rishon LeZion |
| `FILM_PREFIX` | `7460s2r` | The Odyssey |
| `ATTR` | `imax` | required experience tag |

## Stopping
Once you've booked, disable the workflow (Actions tab → the workflow → **⋯ → Disable workflow**),
or just delete the repo.
