# Loop

Team task tracker, built in two days for the Tist take-home assignment.
Two teams, four users, role-gated admin tools, realtime sync.

- **Live**: <https://loop-tist.vercel.app>
- **Process notes**: <https://loop-tist.vercel.app/process>
- **Source**: <https://github.com/v1shalm/loop-app>

## Demo accounts

| Name | Team | Role | Email | Password |
| --- | --- | --- | --- | --- |
| Alex Chen | Design | Admin | `alex@loop.app` | `alex-loop-2026` |
| Mia Patel | Design | Member | `mia@loop.app` | `mia-loop-2026` |
| Ravi Kumar | Engineering | Admin | `ravi@loop.app` | `ravi-loop-2026` |
| Priya Shah | Engineering | Member | `priya@loop.app` | `priya-loop-2026` |

RLS enforces team isolation. A Design member cannot see Engineering
tasks even by guessing IDs.

## Stack

- **Next.js 16** (App Router, server components, server actions)
- **Supabase** (Postgres + RLS + magic-link + Google OAuth + realtime)
- **Tailwind v4** with OKLCH tokens for light + dark
- **Motion** (Framer) for the drawer, transitions, and gestures
- **Switzer** typeface from Fontshare (system fallbacks in
  `--font-sans`)

## Run locally

See [SETUP.md](./SETUP.md) for the 10-minute walkthrough: create the
Supabase project, run the migrations, seed demo accounts, wire env
vars, and `npm run dev`.

## Project structure

```
app/                  Next.js routes (App Router)
  (app)/              Authed surfaces: my work, inbox, projects, team
  login/              Sign-in
  onboarding/         First-run team creation
  process/            Case study (live at /process)
components/           Shared client components
lib/                  Server actions, Supabase clients, queries, parsers
supabase/migrations/  Idempotent SQL migrations, numbered 0001…0026
scripts/              One-off scripts (e.g. screenshot capture)
public/screens/       Light + dark screenshots used in the case study
```

## Capture screenshots

```bash
node scripts/capture-screens.mjs
```

Logs in as Alex against the deployed app, walks six surfaces in light
mode, then in dark mode. Output goes to `public/screens/{light,dark}/`.
