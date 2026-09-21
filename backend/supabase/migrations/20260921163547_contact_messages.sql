-- The contact form's inbox.
--
-- A WRITE-ONLY table, and that is the whole design. The form is public, so
-- `anon` has to be able to insert — and a table that anyone on the internet
-- can write to is a table nobody should be able to read back over the API. So
-- there is an INSERT policy and no SELECT, UPDATE or DELETE policy at all, and
-- no SELECT grant to go with them.
--
-- Two things follow from that, both deliberate:
--
--   * Messages are read in Studio or with the service key, never through a
--     session. Nothing in the app reads this table.
--   * The server action must not ask for the row back. `insert ... returning`
--     is gated by the SELECT policy, and with no policy to satisfy, adding a
--     `.select()` would turn every successful submission into a 403.
--
-- Consent is a column with a CHECK rather than something the form promises:
-- `privacy_accepted` must be true, so a message that was sent without the box
-- ticked cannot be stored at all, however the request arrived.

create table public.contact_messages (
  id               uuid primary key default gen_random_uuid(),
  -- Recorded when there is a session, null for a signed-out visitor. Defaults
  -- from auth.uid() and appears in no grant, so it cannot be forged or
  -- borrowed — it is the one field on this table that is actually trustworthy.
  --
  -- ON DELETE SET NULL, not CASCADE: closing an account should not quietly
  -- retract the feedback it sent.
  user_id          uuid default auth.uid()
                     references auth.users (id) on delete set null,
  name             text,
  email            text not null,
  message          text not null,
  privacy_accepted boolean not null,
  created_at       timestamptz not null default now(),

  -- Optional, so null means "didn't say". An empty string would be a second
  -- way to say the same thing.
  constraint contact_messages_name_not_blank
    check (name is null or btrim(name) <> ''),
  constraint contact_messages_name_length
    check (name is null or length(name) <= 80),

  -- Deliberately loose. Anything stricter starts rejecting addresses that
  -- genuinely work; this only rules out input that could not be an address at
  -- all, which is the most a schema should claim to know.
  constraint contact_messages_email_shape
    check (email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  constraint contact_messages_email_length
    check (length(email) <= 254),

  constraint contact_messages_message_not_blank
    check (btrim(message) <> ''),
  -- A bound on what one anonymous request can store, as much as a limit on
  -- how much anyone needs to write.
  constraint contact_messages_message_length
    check (length(message) <= 4000),

  -- The consent itself. Not "we asked" — a row cannot exist without it.
  constraint contact_messages_privacy_accepted
    check (privacy_accepted)
);

-- Newest first, which is the only way anyone will ever read this.
create index contact_messages_created_at_idx
  on public.contact_messages (created_at desc);

comment on table public.contact_messages is
  'WRITE-ONLY. Public form target: anon may INSERT, and there is no SELECT '
  'policy or grant for any session role. Read it with the service key or in '
  'Studio. Do not add a SELECT policy without deciding who, precisely, is '
  'allowed to read strangers'' messages.';

alter table public.contact_messages enable row level security;

-- The only policy on the table. `user_id` is not grantable and defaults to
-- auth.uid(), so this can only ever be satisfied by the truth — it is here to
-- state the rule rather than to catch anything a client could actually do.
create policy contact_messages_insert_anyone on public.contact_messages
for insert to anon, authenticated
with check ( user_id is null or user_id = (select auth.uid()) );

-- Same revoke-first reasoning as every other table here: Supabase's default
-- privileges hand both roles table-wide access the moment a public table is
-- created, so without this the narrowing below is a no-op — and on THIS table
-- that would mean the whole internet could read the inbox.
revoke all on public.contact_messages from anon, authenticated;

grant usage on schema public to anon;

-- Note what is absent: SELECT. Also absent are id, user_id and created_at,
-- which the database fills in and no caller may choose.
grant insert (name, email, message, privacy_accepted)
  on public.contact_messages to anon, authenticated;
