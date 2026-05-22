-- ─────────────────────────────────────────────────────────────────────────────
-- One-off: create the public demo account used by the "Try the demo" button.
-- Idempotent — re-running is a no-op if the user already exists.
--
-- Run with:
--   npx supabase db query --linked --file supabase/demo-user.sql
--
-- Credentials (intentionally public, same as login-form.tsx constants):
--   email:    demo@loop.app
--   password: demo-loop-2026
-- ─────────────────────────────────────────────────────────────────────────────

do $$
declare
  uid uuid;
  existing_id uuid;
begin
  select id into existing_id from auth.users where email = 'demo@loop.app';
  if existing_id is not null then
    raise notice 'Demo user already exists with id %, skipping insert.', existing_id;
    return;
  end if;

  uid := gen_random_uuid();

  insert into auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    raw_app_meta_data,
    raw_user_meta_data,
    email_confirmed_at,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) values (
    uid,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'demo@loop.app',
    crypt('demo-loop-2026', gen_salt('bf')),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Demo User"}'::jsonb,
    now(),
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  insert into auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) values (
    gen_random_uuid(),
    uid,
    uid::text,
    jsonb_build_object('sub', uid::text, 'email', 'demo@loop.app'),
    'email',
    now(),
    now(),
    now()
  );

  raise notice 'Demo user created with id %.', uid;
end $$;
