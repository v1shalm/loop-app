# Loop local setup

A 10-minute walkthrough to get the app running against a real Supabase backend.

## 1. Create a Supabase project

1. Go to <https://supabase.com> and sign in.
2. Click **New project** and name it `loop`. Pick the **South Asia (Mumbai)** region or whichever is closest.
3. Set a strong database password (you won't need it day-to-day).
4. Wait about 2 minutes for provisioning.

## 2. Run the schema

In the Supabase dashboard:

1. Open the **SQL Editor** and click **+ New query**.
2. Paste the contents of `supabase/migrations/0001_init.sql` and click **Run**. You should see "Success. No rows returned." The file is idempotent, so re-running it is safe.
3. Start a new query, paste `supabase/seed.sql`, and click **Run**. This creates the Loop workspace and three starter projects.
4. If you set up before the unique-constraint patch, also run `supabase/migrations/0002_dedupe_projects.sql` once to clean up duplicate project rows.

## 3. Configure authentication

1. Go to **Authentication → Sign In / Providers**.
2. Confirm the **Email** provider is enabled (it is by default). Magic link works as long as Email is on.
3. Go to **Authentication → URL Configuration**:
   - Set **Site URL** to `http://localhost:3000`.
   - Add `http://localhost:3000/auth/callback` to **Redirect URLs**.
4. Save.

If you want the magic-link email to match Loop's tone, edit the template at **Authentication → Email Templates → Magic Link**. The default works fine for the demo.

## 4. Wire env vars

1. Go to **Settings → API Keys** in the Supabase dashboard.
2. Copy these three values:
   - The **Project URL** goes into `NEXT_PUBLIC_SUPABASE_URL`.
   - The **publishable** key (`sb_publishable_…`) goes into `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
   - The **secret** key (`sb_secret_…`) goes into `SUPABASE_SERVICE_ROLE_KEY`. This is optional and only used for scripts.
3. From the project root, copy the template:
   ```bash
   cp .env.local.example .env.local
   ```
4. Paste the values into `.env.local` and save.

The codebase also accepts the legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` as a fallback, so existing setups keep working.

## 5. Restart the dev server

The proxy reads env vars once at boot. You'll need to restart it the first time you set them.

```bash
# kill the existing dev server (look up its PID via tasklist)
taskkill //F //PID <pid>
npm run dev
```

## 6. Sign in

Open <http://localhost:3000>. The proxy will bounce you to `/login`. Enter your email, click **Send magic link**, then click the link from your inbox. You should land on `/today`.

Behind the scenes the database trigger creates a `profiles` row for your auth user and adds you to the Loop workspace as a member.

You will see three seeded projects in the sidebar with 0 tasks each. Press `Q` (or `⌘K`) to add your first task.

## 7. Invite teammates (for the live demo)

The assign-task moment needs a second user. Two options:

**Option A. Real signup.** Have a teammate visit <http://localhost:3000/login> and sign in with their email. The trigger auto-adds them to Loop.

**Option B. Quick test accounts.** In the Supabase dashboard, go to **Authentication → Users → Add user → Send invite**. Enter a test email you control. Gmail's `+alias` trick lets you receive multiple invites in one inbox (e.g. `vishalm.designs+priya@gmail.com`).

## Troubleshooting

**"Supabase isn't configured yet" on /login.**
The env vars aren't loaded. Confirm `.env.local` is in the project root (not inside `app/`) and restart the dev server.

**Redirect loop or "missing_code" on callback.**
Your **Redirect URL** in Supabase Auth doesn't match. It must be exactly `http://localhost:3000/auth/callback` for local dev.

**RLS errors when reading data.**
You're signed in but not a workspace member. Check with:
```sql
select * from workspace_members where user_id = auth.uid();
```
If the result is empty, the trigger didn't fire. Add yourself manually:
```sql
insert into workspace_members (workspace_id, user_id)
values ('00000000-0000-0000-0000-000000000001', '<your auth uid>');
```

**Realtime not firing.**
Confirm `tasks` and `task_comments` are in the `supabase_realtime` publication. Go to **Database → Publications → supabase_realtime** in the dashboard.
