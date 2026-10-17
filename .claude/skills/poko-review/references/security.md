# Security review

Poko's security model is: **RLS decides which rows, grants decide which
columns, triggers decide which moves, and the frontend decides nothing.** Every
check below exists because there is a way to get it wrong that produces no
error and no test failure.

Read this alongside the actual schema — `backend/supabase/migrations/` in
timestamp order — rather than from memory of it. Later migrations redefine
earlier objects.

## Contents

1. [The grant boundary](#1-the-grant-boundary) — the single most common loophole
2. [Row level security](#2-row-level-security)
3. [Security-definer routines](#3-security-definer-routines)
4. [Blind voting](#4-blind-voting-the-guarantee-everything-else-serves)
5. [Realtime](#5-realtime)
6. [Sessions, identity and anonymous guests](#6-sessions-identity-and-anonymous-guests)
7. [Server actions as public endpoints](#7-server-actions-as-public-endpoints)
8. [The write-only inbox](#8-the-write-only-inbox)
9. [Secrets and configuration](#9-secrets-and-configuration)
10. [Cross-file invariants](#10-cross-file-invariants)

---

## 1. The grant boundary

**Supabase's default privileges hand `anon` and `authenticated` table-wide
access the moment a table is created in `public`.** Every table in this schema
therefore opens with a `revoke all ... from anon, authenticated` and then grants
back specific columns. Without the revoke, the narrowing that follows is a
no-op and RLS is the only thing left standing — which still lets a caller write
any column of any row they're allowed to touch at all.

Check, for every new or altered table:

- [ ] `revoke all on public.<table> from anon, authenticated;` is present, and
      comes **before** the grants.
- [ ] Grants are **column-level** for INSERT and UPDATE, never bare
      `grant insert on <table>`.
- [ ] The grant lists omit every column the database owns. In this schema that
      means at minimum: `id`, `owner_id`, `user_id`, `slug`, `status`, `round`,
      `estimate`, `closed_at`, `closed_reason`, `round_started_at`,
      `round_ends_at`, `round_paused_at`, `round_duration_seconds`,
      `created_at`, `updated_at`, `sort_order`, `voted_round`, `voted_at`.
- [ ] A new column added to an existing table did **not** get swept into a
      grant it shouldn't be in. Column grants are additive — `grant insert
      (key, sprint_id)` extends the list without restating it, which is correct,
      but it also means a careless `grant insert (...)` that restates the list
      can silently *add* a column.
- [ ] Removing a column from a grant was done as an explicit
      `revoke insert (col) on ... from authenticated` — Postgres has no
      "remove one column from a grant" form. See the `round_duration_seconds`
      revoke in `20260921180945_custom_round_timer.sql` for the pattern.

**Why each omission matters, concretely:**

| Column | If it were grantable |
|---|---|
| `owner_id` | File an issue owned by someone else, or steal one by reassignment |
| `slug` | The slug is a capability token — choosing it means guessing-free access to a room, and the before-insert trigger regenerates it precisely so the client can't |
| `status`, `round`, `estimate` | Close a round, fake an agreed estimate, or rewind the round counter to re-read old votes |
| `round_ends_at`, `round_paused_at`, `round_duration_seconds` | Hand yourself more time, or freeze the clock; these move only through `start_round`/`pause_round`/`resume_round`/`stop_round`/`reset_round` |
| `voted_round`, `voted_at` | Claim to have voted without a card, breaking the auto-close count |
| `contact_messages.user_id` | Attribute a message to another account |
| `issue_order.*` | It has **no** write grant at all — `reorder_issues` is the only writer |

**Tables with no write grant at all**, by design:

- `issue_participants` — no INSERT policy *and* no INSERT grant. `join_issue()`
  is the only door in. Only `display_name` is updatable; DELETE is allowed for
  yourself or by the issue owner.
- `issue_order` — SELECT only. `reorder_issues()` is the only writer.
- `contact_messages` — INSERT of four columns only, and **no SELECT at all**.

If a change adds a write path to any of these outside its routine, that is a
Critical finding regardless of how well-guarded the new path looks — the point
of "one door" is that there is one door to audit.

## 2. Row level security

- [ ] `alter table ... enable row level security;` on every new table in
      `public`. A table without it is readable by anyone with the anon key.
- [ ] UPDATE policies have **both** `using` and `with check`. With only
      `using`, the row is selectable for update and then writable to any value
      — including reassigning `owner_id` to yourself or away from yourself.
      Compare `issues_update_owner`.
- [ ] A policy meant to *narrow* is `as restrictive`. Permissive policies OR
      together, so a permissive "extra condition" policy grants access rather
      than removing it. The `is_anonymous` guards on `issues` and `sprints` are
      restrictive for exactly this reason — as permissive policies they would
      have done nothing.
- [ ] `auth.uid()` is wrapped: `(select auth.uid())`, not a bare call. The
      subquery makes it an InitPlan evaluated once per statement instead of
      once per row. This is a correctness-adjacent performance rule; a policy
      on a large scan without it is a Minor finding.
- [ ] A policy that needs to read another table calls a **security definer
      helper in `private`**, not an inline subquery — an inline read of
      `issue_participants` from a policy on `issue_participants` recurses.
      Existing helpers: `is_issue_participant`, `is_issue_owner`,
      `round_is_revealed`, `has_sprint_seat`, `can_use_issue_topic`,
      `poko_issue_sprint_is_owned`.
- [ ] A SELECT policy that will gate an INSERT's `RETURNING` clause
      short-circuits on a **plain column comparison first**. PostgREST asks for
      the row back on every insert, and a STABLE helper reads the statement's
      starting snapshot, which does not contain the row being inserted. This
      broke sprint creation once already — see the comment on
      `sprints_select_visible`. Same shape as `issues_select_participants`.
- [ ] New policies do not accidentally widen an existing one. Two permissive
      SELECT policies on the same table mean "either", not "both".

## 3. Security-definer routines

Every `security definer` function is a hole punched through RLS, so each one
carries the same five obligations. Check all five, every time:

- [ ] `set search_path = ''` in the function definition, and every object
      reference inside is **schema-qualified** (`public.issues`, not `issues`).
      Without it, a caller who can create objects in a schema on the search
      path can shadow a table name and run their code with the definer's
      rights.
- [ ] `revoke all on function ... from public, anon;` then
      `grant execute ... to authenticated;`. **Postgres grants EXECUTE to
      PUBLIC by default** — a definer function without the revoke is callable
      with no session at all.
- [ ] It authorizes explicitly. `auth.uid()` is captured into a local and
      compared against `owner_id`, or seat membership is checked, before
      anything is written. RLS is *off* inside these functions; the function
      body is the only authorization there is.
- [ ] It locks before it decides: `select * into v_issue from public.issues
      where id = p_issue_id for update;` before the authority check and the
      write. Check-then-act without the lock is a TOCTOU race.
- [ ] Client-supplied arguments are validated **before** they reach a read that
      could disclose existence. `start_round` checks its `p_seconds` bounds
      first, so a nonsense length can't be the thing that tells you whether an
      issue exists. Arrays are bounded (`reorder_issues` caps at 1000). Text
      that will become a uuid is regex-matched first, never cast directly —
      `can_use_issue_topic` does this because a `22P02` raised inside a policy
      fails the channel join opaquely.

Also:

- [ ] A `text` parameter that selects behaviour is validated against an
      explicit allow-list with **no default branch**. `delete_sprint`'s
      disposition is checked `not in ('uncategorize','move','delete')` and
      raises, because the branches differ by "your issues survive" versus "your
      issues are gone". Same rule in the TypeScript: `clearIssues` refuses an
      unrecognised scope rather than defaulting.
- [ ] Failures raise with a distinct `hint = 'poko_*'`, and the message carries
      no schema detail a client shouldn't have. The frontend branches on
      `error.hint`; a new failure mode with no hint forces prose-parsing, and a
      new hint with no case in `describe()` shows the raw Postgres message to a
      user.

## 4. Blind voting — the guarantee everything else serves

Nobody sees anybody's card until the round closes, and then everybody sees them
at the same instant. Four mechanisms hold this up. A change that weakens any
one of them is Critical even if the other three still stand.

- [ ] **The SELECT policy.** `votes_select_own_or_revealed` allows a row only
      if you're seated *and* (it's yours *or* the round is revealed). Note the
      `user_id = auth.uid()` branch is load-bearing beyond reads: an UPDATE
      must first SELECT the row, so removing it would make changing your own
      card silently affect zero rows with no error.
- [ ] **`votes` is in no Realtime publication.** Postgres Changes on that table
      would stream values as they're written. Check that no migration adds it
      to `supabase_realtime`.
- [ ] **Broadcast payloads carry no card values.** `vote_cast` carries
      `user_id`, `round`, `voted_at` — who and when, never what. The *only*
      payload that may carry values is `round_closed`, built inside
      `close_round_locked` at the moment they become readable anyway. A
      broadcast is identical for every subscriber and **is not filtered by
      RLS**, so one convenience field added to a trigger payload ends blind
      voting with no error and no failing test. Scrutinise every
      `jsonb_build_object` in a broadcast.
- [ ] **The client never merges payloads into its own state.** Events are a
      nudge to re-read (`useRoomChannel`'s doc comment says so explicitly), so
      values only ever arrive through an RLS-checked query. A component that
      starts reading `payload.votes` for anything other than the close
      animation re-introduces the leak from the other end.

Also check: `close_round_locked` is the *single* place a round closes, so the
estimate rule and the flip payload can't drift between the automatic and manual
paths. A second closing path is a finding on its own.

## 5. Realtime

- [ ] The write policy on `realtime.messages` stays **presence-only**. If
      clients can insert `broadcast` messages, any participant can emit a
      forged `round_closed` with invented values to the whole room and defeat
      blind voting at the presentation layer. Real events come from triggers,
      which Realtime delivers as `supabase_admin`, not subject to this policy.
- [ ] The read policy covers `broadcast` and `presence` only, and gates on
      topic membership via `can_use_issue_topic`.
- [ ] Client channels are created with `private: true`, matching the `true`
      passed to `realtime.send` in `poko_broadcast`. A public broadcast never
      reaches a private channel — mismatch here means events silently vanish.
- [ ] `poko_broadcast` keeps its `exception when others then raise warning`
      wrapper. A Realtime hiccup must never roll back a vote; a missed
      animation is recoverable, a lost vote is not.
- [ ] Presence is used for "who has a tab open" only. **The auto-close
      denominator comes from the seat table**, never from presence — a flaky
      network would otherwise close rounds early.

## 6. Sessions, identity and anonymous guests

- [ ] Identity comes from `supabase.auth.getClaims()` server-side. A user id
      passed in from the client is an argument, not an identity.
- [ ] Authorization never reads `user_metadata`. It is editable by the user it
      belongs to — `signUp` stores `full_name` there and the comment says
      exactly this. `is_anonymous` is issued by GoTrue and is safe to branch on;
      that's what `proxy.ts`/`middleware.ts` uses to tell a member from a guest.
- [ ] In `updateSession`: no code between `createServerClient` and
      `getClaims()`, and the `supabaseResponse` is returned as-is (or its
      cookies copied onto the redirect via `redirectPreservingSession`).
      Returning a bare `NextResponse.redirect()` drops the refreshed cookies
      and logs the user out at random.
- [ ] A new protected route is added to `PROTECTED_PREFIXES`. The matcher in
      `proxy.ts` covers everything except static assets, but the prefix list is
      what actually gates.
- [ ] Anywhere `signInAnonymously` is called, an existing session is checked
      first. It does not refuse when one exists — it **replaces** it, so
      clicking a colleague's invite would sign you out of your own account into
      a throwaway. `joinRoom` guards this; any new join path must too.
- [ ] Guests can join and vote but never own. The `*_insert_not_anonymous`
      restrictive policies enforce it on `issues` and `sprints`; a new
      ownable table needs its own.

## 7. Server actions as public endpoints

A `"use server"` export is an HTTP endpoint anyone can call with any arguments.
The form's validation is a courtesy to the user; it is not a control.

- [ ] Every argument is re-validated in the action, independently of the form —
      lengths, enums, numeric ranges, required fields. `validateDraft` and the
      `startRound` bounds check are the model.
- [ ] The validation **mirrors a CHECK constraint or an RPC guard**, rather
      than being the only enforcement. Where it mirrors one, the two must agree
      — `lib/contact/limits.ts` exists specifically so the form and the column
      CHECK can't drift, and the `startRound` bounds match both
      `issues_duration_range` and the check inside `start_round`.
- [ ] Nothing trusts an id passed from the client as proof of anything. Pass it
      to an RPC that authorizes, or rely on an RLS policy that filters — never
      on the fact that the UI only renders the button for owners.
- [ ] Errors go through `describe()`; raw Postgres messages are not returned to
      the user, and new `poko_*` hints get a case added.
- [ ] `revalidatePath` is called after anything a rendered page reads, so the
      server's view wins over optimistic client state.

## 8. The write-only inbox

`contact_messages` is public-write, zero-read, and that's the entire design.

- [ ] No SELECT policy and no SELECT grant, for any role. The table comment
      says not to add one without deciding precisely who may read strangers'
      messages.
- [ ] The insert has **no `.select()`**. `insert ... returning` is gated by the
      SELECT policy, and with no policy every successful submission would 403.
      This looks like a missing return value; it is not.
- [ ] `privacy_accepted` stays a column with a `check (privacy_accepted)`, so a
      message sent without consent cannot be stored however the request
      arrived. Consent is a record, not a promise the form makes.
- [ ] `user_id` stays out of the grant list and keeps `default auth.uid()`.
- [ ] Any new public-write table repeats this shape: revoke, column-level
      insert grant, no select, bounded lengths via CHECK. Ask what stops one
      script filling the table — currently the length caps and Supabase's own
      rate limiting, which is worth flagging if a new endpoint has neither.

## 9. Secrets and configuration

- [ ] Only `NEXT_PUBLIC_SUPABASE_URL` and
      `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` appear in frontend code. A service
      role key anywhere under `frontend/` is Critical — `NEXT_PUBLIC_*` is
      compiled into the browser bundle, and even a non-public service key in a
      server component is a key one import away from a client component.
- [ ] No `.env*` file is in the diff.
- [ ] `backend/supabase/seed.sql` keeps its guard refusing to run unless the
      JWT secret is the Supabase development default. That's what stops a known
      password reaching a real project via `db reset --linked`.
- [ ] No credentials, tokens or real user data in migrations, tests or fixtures
      beyond the local-only seed.

## 10. Cross-file invariants

Rules where the code in front of you looks correct on its own and is wrong in
context. They belong here because no single file shows the violation.

**Any code that reads `round_ends_at` must also check `round_paused_at`.** The
full test is:

```sql
round_paused_at is null and round_ends_at is not null and now() >= round_ends_at
```

`round_ends_at` is never recalculated on pause — the pause *instant* is stored
instead, and resuming pushes the deadline forward by however long the hold
lasted. So while `round_paused_at` is set, the deadline sits in the past by
design.

Two readers exist today, and each loses a different guarantee without the pause
clause:

- `poko_votes_guard` — a pause would stop votes landing.
- `close_round`'s `v_expired` — holding the clock would hand **every
  participant** the authority to end the round, which is the escalation worth
  treating as Critical.

A third reader that omits the clause fails no existing test. When a change adds
one, check the pause clause is there, and check the pgTAP suite gained an
assertion for it.

