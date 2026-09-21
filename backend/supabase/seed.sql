-- Local development seed: one ready-to-use account.
--
-- `supabase db reset` drops everything, so without this every reset costs a
-- trip through the sign-up flow (and a look in Mailpit) before you can see the
-- dashboard again. This plants the account directly.
--
--     pokoadmin@gmail.com / Poko1234
--
-- Run automatically after migrations on every `supabase db reset`, per
-- `[db.seed]` in config.toml. Safe to run by hand too (`psql -f seed.sql`):
-- it leaves an existing account of the same address alone rather than
-- resetting its password underneath you.
--
-- ---------------------------------------------------------------------------
-- WHY THERE IS A GUARD AROUND ALL OF THIS
--
-- This file creates an account whose password is in version control. That is
-- fine for a throwaway local stack and unacceptable anywhere else, and the one
-- command that could do it — `supabase db reset --linked` — runs seeds against
-- the linked project.
--
-- So the seed refuses unless `app.settings.jwt_secret` is the documented local
-- default. Every real project has its own secret, which makes this a reliable
-- "am I on the dev stack" test rather than a comment asking people to be
-- careful. It fails by doing nothing and saying so.
-- ---------------------------------------------------------------------------
do $$
declare
  -- Fixed rather than generated, so the id survives a reset. Handy when a test
  -- script or a SQL snippet wants to name this account, and obviously
  -- synthetic at a glance.
  v_user_id  uuid := '00000000-0000-4000-8000-000000000001';
  v_email    text := 'pokoadmin@gmail.com';
  v_name     text := 'Poko Admin';
  v_password text := 'Poko1234';

  v_local_jwt_secret constant text :=
    'super-secret-jwt-token-with-at-least-32-characters-long';
  v_existing uuid;

  -- Card faces copied from `deckPresets` in frontend/lib/decks.ts, exactly.
  -- The edit dialog works out which preset an issue uses by comparing the deck
  -- name AND every value, so a stray card here would make these issues open as
  -- "Custom deck" with the preset silently unselected.
  v_fibonacci  text[] := array['0','1','2','3','5','8','13','21','?','☕'];
  v_powers     text[] := array['1','2','4','8','16','32','64','?','☕'];
  -- Deliberately not a preset: the custom-deck branch of the dialog needs
  -- something to open with too.
  v_confidence text[] := array['Low','Medium','High','?'];

  v_sprint_24 uuid;
  v_sprint_25 uuid;
  v_settled   uuid;
begin
  if coalesce(current_setting('app.settings.jwt_secret', true), '')
     is distinct from v_local_jwt_secret then
    raise warning 'poko seed: skipped — this does not look like the local dev stack, and this seed plants a known password.';
    return;
  end if;

  select id into v_existing from auth.users where email = v_email;

  if v_existing is not null then
    -- Keep going: the account is here, but its sample data may not be (a reset
    -- of the issues alone, or a "Clear all" in the sidebar). The fixtures
    -- below decide that for themselves.
    v_user_id := v_existing;
    raise notice 'poko seed: % already exists (%) — password left untouched.',
      v_email, v_existing;
  end if;

  if v_existing is null then

    -- Mirrors exactly what GoTrue's admin endpoint writes for an email/password
    -- signup, because anything less is a row that exists but cannot log in:
    --
    --   * encrypted_password is bcrypt, which is the only thing GoTrue will
    --     compare a password against.
    --   * email_confirmed_at is set, so there is no confirmation link to chase.
    --   * raw_app_meta_data names the provider; raw_user_meta_data carries
    --     full_name, which is where the header and seat labels read the display
    --     name from.
    --   * the four token columns are EMPTY STRINGS, not null. They are nullable
    --     in the schema, but GoTrue scans them into plain Go strings, so a null
    --     makes every login fail with "Database error querying schema" — an
    --     error about the row it just read, not about the password. This is the
    --     one difference between a row that exists and a row that can log in,
    --     and it is invisible until you try.
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      created_at, updated_at
    )
    values (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      v_email,
      extensions.crypt(v_password, extensions.gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
      jsonb_build_object('full_name', v_name, 'email_verified', true),
      '', '', '', '',
      now(),
      now()
    );

    -- The identity row is not optional. GoTrue resolves an email/password login
    -- through auth.identities, so a user without one is invisible to sign-in
    -- even with a perfectly good password hash.
    --
    -- `email` is a generated column on this table (lower(identity_data->>'email'))
    -- and must not be supplied.
    insert into auth.identities (
      id, user_id, provider, provider_id, identity_data, created_at, updated_at
    )
    values (
      gen_random_uuid(),
      v_user_id,
      'email',
      v_user_id::text,
      jsonb_build_object(
        'sub', v_user_id::text,
        'email', v_email,
        'email_verified', true,
        'phone_verified', false
      ),
      now(),
      now()
    );

    -- public.profiles needs no insert here: the users_after_insert trigger from
    -- the account_profiles migration has already made it.
    raise notice 'poko seed: % is ready (password: %).', v_email, v_password;
  end if;

  -- -------------------------------------------------------------------------
  -- Sample sprints and issues.
  --
  -- Only when the account holds none. That keeps a re-run from stacking up
  -- duplicates, and it doubles as a way to put the fixtures back: clear the
  -- issues from the sidebar, run the seed again, and they return.
  --
  -- Everything below runs as `postgres`, which bypasses RLS and the per-column
  -- grants. So owner_id and user_id have to be named explicitly — their
  -- `default auth.uid()` is null outside a request — and the round is closed
  -- through the private routine rather than public.close_round(), which would
  -- refuse because there is no auth.uid() to authorise.
  -- -------------------------------------------------------------------------
  if exists (select 1 from public.issues where owner_id = v_user_id) then
    raise notice 'poko seed: % already has issues — sample data left alone.',
      v_email;
    return;
  end if;

  insert into public.sprints (owner_id, name)
  values (v_user_id, 'Sprint 24'), (v_user_id, 'Sprint 25')
  on conflict (owner_id, lower(name)) do nothing;

  select id into v_sprint_24
    from public.sprints
   where owner_id = v_user_id and lower(name) = 'sprint 24';

  select id into v_sprint_25
    from public.sprints
   where owner_id = v_user_id and lower(name) = 'sprint 25';

  -- created_at is set by hand on every row, and that is not decoration.
  --
  -- The sidebar sorts issues it has no saved order for by created_at desc, and
  -- a sprint card takes its position from its first issue. Everything here is
  -- inserted in one transaction, where now() is the transaction's start time —
  -- so left to the default, all six rows would share a timestamp to the
  -- microsecond and the display order would be whatever the planner felt like.
  --
  -- Spacing them out fixes the arrangement: Sprint 25 on top as the one being
  -- refined, Sprint 24 beneath it in key order, and the unfiled spike last
  -- (though Uncategorized sinks to the bottom regardless).

  -- Sprint 24: one settled, one open, one waiting on a clock.
  insert into public.issues
    (owner_id, sprint_id, key, name, summary, deck_name, deck_values, created_at)
  values (
    v_user_id, v_sprint_24, 'PK-231', 'Add SSO for enterprise workspaces',
    'SAML for sign-in plus SCIM for provisioning. Okta and Entra ID first; '
      || 'everything else can wait for the second pass.',
    'Fibonacci', v_fibonacci, now() - interval '10 minutes'
  )
  returning id into v_settled;

  insert into public.issues
    (owner_id, sprint_id, key, name, deck_name, deck_values, created_at)
  values (
    v_user_id, v_sprint_24, 'PK-232', 'Rework the billing page',
    'Fibonacci', v_fibonacci, now() - interval '11 minutes'
  );

  -- A timebox that has not been started: round_ends_at stays null until
  -- start_round() is called, which is the state the Start button renders from.
  insert into public.issues
    (owner_id, sprint_id, key, name, summary, deck_name, deck_values,
     round_duration_seconds, created_at)
  values (
    v_user_id, v_sprint_24, 'PK-233', 'Rate-limit the public API',
    'Per-token buckets. The number we need is how much work the middleware is, '
      || 'not how the limits are set.',
    'Powers of two', v_powers, 300, now() - interval '12 minutes'
  );

  -- Sprint 25: the one on top, freshly pulled in and not yet estimated.
  insert into public.issues
    (owner_id, sprint_id, key, name, summary, deck_name, deck_values, created_at)
  values (
    v_user_id, v_sprint_25, 'PK-240', 'Migrate asset delivery to the new CDN',
    'Dual-serve behind a flag, then cut over. Rollback has to stay a flag flip.',
    'Fibonacci', v_fibonacci, now() - interval '1 minute'
  );

  insert into public.issues
    (owner_id, sprint_id, key, name, deck_name, deck_values, created_at)
  values (
    v_user_id, v_sprint_25, 'PK-241', 'Fix the flaky upload integration test',
    'Fibonacci', v_fibonacci, now() - interval '2 minutes'
  );

  -- No sprint and no key: the Uncategorized card, on a deck that is not a
  -- preset so the dialog's custom branch has something to open with.
  insert into public.issues
    (owner_id, key, name, summary, deck_name, deck_values, created_at)
  values (
    v_user_id, null, 'Spike: is Temporal worth it?',
    'Not a story — a timebox on reading enough to have an opinion.',
    'Confidence', v_confidence, now() - interval '20 minutes'
  );

  -- Settle PK-231, so the sidebar has a "Saved 8" row and the room has a
  -- closed round to reopen. One seat, one card, so the estimate is unanimous
  -- by definition; a split needs a second person, which an invite link and a
  -- private window will get you in about ten seconds.
  insert into public.votes (issue_id, round, user_id, value)
  values (v_settled, 1, v_user_id, '8');

  perform private.close_round_locked(v_settled, 'manual');

  raise notice 'poko seed: 2 sprints and 6 issues ready for %.', v_email;
end $$;
