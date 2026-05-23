-- Create the "Demo Users" required for the one-click demo login

do $$
declare
  ws_id uuid := '00000000-0000-0000-0000-000000000001';
  t_design uuid := gen_random_uuid();
  t_eng uuid := gen_random_uuid();
  
  -- Users
  u_alex uuid := gen_random_uuid();
  u_mia uuid := gen_random_uuid();
  u_ravi uuid := gen_random_uuid();
  u_priya uuid := gen_random_uuid();
begin
  -- Teams
  insert into public.teams (id, workspace_id, name) values 
    (t_design, ws_id, 'Design'),
    (t_eng, ws_id, 'Engineering');

  -- Auth Users
  -- Note: pgcrypto is required for crypt(). If this fails, the extension might be in a different schema.
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
  )
  values
    ('00000000-0000-0000-0000-000000000000', u_alex, 'authenticated', 'authenticated', 'alex@loop.app', public.crypt('alex-loop-2026', public.gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"name":"Alex"}', now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', u_mia, 'authenticated', 'authenticated', 'mia@loop.app', public.crypt('mia-loop-2026', public.gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"name":"Mia"}', now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', u_ravi, 'authenticated', 'authenticated', 'ravi@loop.app', public.crypt('ravi-loop-2026', public.gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"name":"Ravi"}', now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', u_priya, 'authenticated', 'authenticated', 'priya@loop.app', public.crypt('priya-loop-2026', public.gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"name":"Priya"}', now(), now(), '', '', '', '');

  -- Identities
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values
    (gen_random_uuid(), u_alex, u_alex, format('{"sub":"%s","email":"%s"}', u_alex::text, 'alex@loop.app')::jsonb, 'email', now(), now(), now()),
    (gen_random_uuid(), u_mia, u_mia, format('{"sub":"%s","email":"%s"}', u_mia::text, 'mia@loop.app')::jsonb, 'email', now(), now(), now()),
    (gen_random_uuid(), u_ravi, u_ravi, format('{"sub":"%s","email":"%s"}', u_ravi::text, 'ravi@loop.app')::jsonb, 'email', now(), now(), now()),
    (gen_random_uuid(), u_priya, u_priya, format('{"sub":"%s","email":"%s"}', u_priya::text, 'priya@loop.app')::jsonb, 'email', now(), now(), now());

  -- Update profiles with their proper names, trigger might have just set them to email prefixes.
  update public.profiles set name = 'Alex' where id = u_alex;
  update public.profiles set name = 'Mia' where id = u_mia;
  update public.profiles set name = 'Ravi' where id = u_ravi;
  update public.profiles set name = 'Priya' where id = u_priya;

  -- Add to teams
  insert into public.team_members (team_id, user_id, role) values
    (t_design, u_alex, 'admin'),
    (t_design, u_mia, 'member'),
    (t_eng, u_ravi, 'admin'),
    (t_eng, u_priya, 'member');

end $$;
