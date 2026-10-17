---
name: poko-review
description: >-
  Code review for the Poko codebase, weighted toward the failures that produce
  no error and no failing test — RLS policies, column grants, security-definer
  routines, blind voting, realtime payloads, and session handling. Use this
  whenever reviewing Poko code: a diff, a branch, a pull request, a migration,
  a server action, or a full sweep. Also use it when the user asks "is this
  safe to merge?", "did I miss anything?", "check this migration", "review my
  changes", or asks for a security or correctness pass. Prefer it over a
  generic review — Poko's guarantees live in database grants and triggers that
  a generic reviewer reads straight past.
---

# Poko code review

Poko is a planning-poker tool. Its guarantees are enforced in Postgres, not in
the app: **which rows you can see is RLS, which columns you can write is a
grant, and whether a move is legal now is a trigger.** The frontend is a
presentation layer over that. A reviewer who checks only the TypeScript is
reviewing the thin half.

This skill is deliberately narrow. It does not restate the conventions in
`CLAUDE.md` (already loaded every session) or general React, accessibility and
testing practice — apply those normally. What it carries is the part that
can't be inferred from reading one file: the database boundary, where a
mistake is invisible. A missing `revoke` doesn't throw. A `.select()` on the
wrong table doesn't fail until production. One extra field in a broadcast
payload ends blind voting, and every test still passes.

## How to run a review

### 1. Scope it

| The user says | Review |
|---|---|
| nothing, or "my changes" | `git diff dev...HEAD` plus uncommitted changes |
| a PR number / branch | that branch's diff against `dev` |
| a path | that file or directory, whole |
| "everything", "all the code" | area by area — see *Full sweeps* |

Read the **whole file** around a changed hunk, and the migration that created
the objects it touches. Poko's invariants are cross-file: a grant decides
whether a server action is reachable at all, and a trigger three migrations
back decides whether a new one is correct. A diff-only read cannot see that.

### 2. Check the database boundary

Read `references/security.md` whenever the change touches
`backend/supabase/migrations/`, `frontend/lib/**/actions.ts`,
`frontend/lib/**/queries.ts`, `frontend/lib/supabase/**`, `proxy.ts`, or
anything realtime. That file is the checklist, with the reason attached to each
item — read the reasons, because a check applied without understanding produces
confident nonsense.

For everything else, review normally: correctness, clarity, conventions. Weight
concurrency heavily — several people act on the same row at once and the
database is the only thing serialising them, so read-then-write without
`for update` is worth flagging every time.

### 3. Verify before reporting

This is the step that separates a useful review from noise.

- **Name the concrete failure.** Who does what, in what order, and what wrong
  thing happens? "This could be a race" is not a finding. "Two voters submit
  within the same millisecond; neither sees the other's uncommitted row; the
  round never auto-closes" is.
- **Check it isn't already handled elsewhere.** Poko defends in depth on
  purpose — the action validates, the RPC re-checks, a CHECK constraint backs
  both. A gap in one layer is only a bug if no layer has it. Say which layers
  you checked.
- **Check it isn't deliberate.** Several things here look like omissions and
  are load-bearing — queries with no user filter (RLS does it), an insert with
  no `.select()` (the table has no SELECT policy), a deadline that sits in the
  past while the clock is paused (the pause instant is the source of truth).
  This codebase comments its reasoning unusually well: before reporting an
  apparent omission, look for the comment that explains it. If there's a
  comment and it still holds, it isn't a finding. If the comment and the code
  disagree, **that gap is the finding**, and usually a real one.
- **Drop what you cannot confirm.** A reviewer with a 60% hit rate trains
  people to skim. Put genuine uncertainty under *Worth a look*, one line each.

### 4. Report

Findings ordered most severe first:

```markdown
## Review: <what was reviewed>

**Verdict:** <Safe to merge | Merge after fixing N | Do not merge>

### Findings

#### 1. [Critical] Votes readable before the flip
`backend/supabase/migrations/20260922_x.sql:47`

The new `votes_select_for_facilitator` policy is permissive, so it ORs with
`votes_select_own_or_revealed` rather than narrowing it. The owner can read
every card while the round is still open.

**How it fails:** Owner opens the room, two people vote, owner queries
`/rest/v1/votes?issue_id=eq.<id>` before closing — both values come back.
Blind voting is gone, and nothing errors.

**Fix:** Make it `as restrictive`, or fold the condition into the existing
policy. That's how the `is_anonymous` guards on `issues` and `sprints` are
written, for exactly this reason.

### Worth a look
- <Unverified observations, one line each.>

### Checked and clean
<What you swept and found nothing in, so the reader knows the coverage.>
```

Severity:

- **Critical** — a security boundary is crossed, or data is lost. Anything that
  leaks a vote before the flip, lets a non-owner act as owner, exposes the
  contact inbox, or lets one user's write reach another user's row.
- **Major** — a real bug users will hit: a broken state transition, a race with
  a plausible trigger, a form that can't recover from an error.
- **Minor** — convention breaks, missing tests for a new invariant, gaps that
  don't block a task.
- **Nit** — style and wording. One grouped bullet list; never let nits
  outnumber the real findings.

If you find nothing, say so and list what you checked. A clean review that
names its coverage is useful; "looks good to me" is not.

## Full sweeps

Don't stream the whole repo through one pass — the later files get a worse
review than the earlier ones. Go area by area, writing findings as you go:

1. `backend/supabase/migrations/` in timestamp order. Later migrations
   redefine earlier objects (`create or replace`, `drop function`), so
   **review the final state** — grep for redefinitions before reporting on a
   function body.
2. `frontend/lib/supabase/` and `frontend/proxy.ts` — the session boundary.
3. `frontend/lib/*/actions.ts` — every public endpoint.
4. `frontend/lib/*/queries.ts` — every RLS-reliant read.
5. `frontend/lib/rooms/`, `frontend/lib/issues/use-drag-order.ts` — the
   stateful client logic, where the concurrency bugs are.
6. `frontend/components/` — behaviour and accessibility.
7. `backend/supabase/tests/` last, because you now know what *should* be
   covered and can name what isn't.

## One habit worth keeping

**Ask what the absence proves.** Most of Poko's security is things
deliberately *not* there: no INSERT policy on `issue_participants`, no SELECT
grant on `contact_messages`, no `owner_id` in any grant list. Reviewing a new
table or grant, the question isn't only "is what's written correct?" but
"what did they forget to leave out?"
