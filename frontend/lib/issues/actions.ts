"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import {
  maxDeckValues,
  maxKeyLength,
  maxSprintNameLength,
  maxSummaryLength,
  minDeckValues,
} from "@/lib/decks"
import type { IssueDraft } from "@/lib/issues/model"
import { createClient } from "@/lib/supabase/server"

/**
 * What a form gets back when the action does not redirect — same contract as
 * `AuthResult` in `lib/auth/actions.ts`. `formError` renders above the fields.
 */
export type IssueResult = {
  formError?: string
}

export type CreateIssueResult = IssueResult & {
  /** Present on success, so the caller can open the room it just created. */
  slug?: string
}

export async function createIssue(
  draft: IssueDraft
): Promise<CreateIssueResult> {
  const fields = validateDraft(draft)
  if (!fields.ok) return { formError: fields.formError }

  const { deckName, key, name, sprintName, summary, values } = fields
  const supabase = await createClient()

  const sprint = await resolveSprint(supabase, sprintName)
  if (!sprint.ok) return { formError: sprint.formError }

  // owner_id and slug are absent on purpose: the database supplies both, and
  // the client holds no grant on either column.
  const { data, error } = await supabase
    .from("issues")
    .insert({
      name,
      key,
      sprint_id: sprint.sprintId,
      summary,
      deck_name: deckName,
      deck_values: values,
      round_duration_seconds: draft.timeboxSeconds,
    })
    .select("slug")
    .single()

  if (error) return { formError: describe(error) }

  revalidatePath("/dashboard")
  return { slug: data.slug }
}

/**
 * Turns the sprint field's text into a sprint id, creating the sprint if this
 * is the first time that name has been used.
 *
 * The form can only report a NAME — its combobox offers to add whatever you
 * typed — so the find-or-create lives here, next to the unique index that
 * makes it safe.
 *
 * Look first, then insert, then look again. That last step is not belt and
 * braces: two issues submitted for a brand-new sprint at once both miss the
 * lookup, and the one that loses the race gets 23505 rather than a row. The
 * re-read turns that into the sprint the winner just made, which is exactly
 * what the loser wanted — the same insert-then-fall-back shape as `castVote`.
 */
async function resolveSprint(
  supabase: Awaited<ReturnType<typeof createClient>>,
  name: string | null
): Promise<
  { ok: true; sprintId: string | null } | { ok: false; formError: string }
> {
  if (name === null) return { ok: true, sprintId: null }

  const existing = await findSprint(supabase, name)
  if (!existing.ok) return existing
  if (existing.sprintId) return existing

  // owner_id is absent on purpose: it defaults to auth.uid() and the client
  // holds no grant on it, so nobody can create a sprint under someone else.
  const { data, error } = await supabase
    .from("sprints")
    .insert({ name })
    .select("id")
    .single()

  if (!error) return { ok: true, sprintId: data.id }

  // 23505 is the (owner_id, lower(name)) index: it already exists, either
  // because we lost a race or because the name differs only by case.
  if (error.code !== "23505") return { ok: false, formError: describe(error) }

  const raced = await findSprint(supabase, name)
  if (!raced.ok) return raced
  if (raced.sprintId) return raced

  return { ok: false, formError: "Couldn't file that under a sprint. Try again." }
}

/**
 * The caller's sprint with this name, matched the way the unique index does —
 * ignoring case.
 *
 * Matched in TypeScript over the caller's own sprints rather than with an
 * `ilike` filter, because `ilike` would read `%` and `_` in a sprint name as
 * wildcards: a sprint called "Q3 (80% capacity)" would match things it isn't.
 * RLS plus the owner filter keeps the list to one person's own sprints, so
 * there is very little to scan.
 */
async function findSprint(
  supabase: Awaited<ReturnType<typeof createClient>>,
  name: string
): Promise<
  { ok: true; sprintId: string | null } | { ok: false; formError: string }
> {
  const { data } = await supabase.auth.getClaims()
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null

  if (!userId) {
    return { ok: false, formError: "Sign in before creating an issue." }
  }

  const { data: sprints, error } = await supabase
    .from("sprints")
    .select("id, name")
    .eq("owner_id", userId)

  if (error) return { ok: false, formError: describe(error) }

  const wanted = name.toLowerCase()
  const match = sprints.find((sprint) => sprint.name.toLowerCase() === wanted)

  return { ok: true, sprintId: match?.id ?? null }
}

/**
 * Puts your card down, or moves it if you already had one.
 *
 * Everything that decides whether this is legal right now — round still open,
 * deadline not passed, value actually in the deck, round not reopened
 * underneath you — lives in the guard trigger, which raises a distinct `hint`
 * for each case. That is deliberate: those are expected, user-facing
 * conditions, not authorization failures.
 */
export async function castVote(
  issueId: string,
  round: number,
  value: string
): Promise<IssueResult> {
  const supabase = await createClient()

  // Insert first, then fall back to an update, rather than one upsert.
  //
  // PostgREST's ON CONFLICT DO UPDATE assigns every column in the payload, so
  // an upsert needs UPDATE on issue_id and round as well as value — and the
  // client deliberately only holds UPDATE on `value`, so that a card can never
  // be moved to a different round or a different issue. One extra round trip
  // when changing your mind is the right price for that narrower grant.
  //
  // user_id is absent from both calls on purpose: it defaults to auth.uid()
  // and the client holds no grant on it, so nobody can vote as someone else.
  const insert = await supabase
    .from("votes")
    .insert({ issue_id: issueId, round, value })

  if (!insert.error) {
    revalidateIssue()
    return {}
  }

  // 23505 means this player already has a card down for this round.
  if (insert.error.code !== "23505") {
    return { formError: describe(insert.error) }
  }

  // RLS narrows this to your own row; there is no need — and no way — to name
  // the user.
  const { error } = await supabase
    .from("votes")
    .update({ value })
    .eq("issue_id", issueId)
    .eq("round", round)

  if (error) return { formError: describe(error) }

  revalidateIssue()
  return {}
}

/** Takes your card back off the table. */
export async function retractVote(
  issueId: string,
  round: number
): Promise<IssueResult> {
  const supabase = await createClient()

  // RLS narrows this to your own row; there is no way to clear anyone else's.
  const { error } = await supabase
    .from("votes")
    .delete()
    .eq("issue_id", issueId)
    .eq("round", round)

  if (error) return { formError: describe(error) }

  revalidateIssue()
  return {}
}

/**
 * Edits an issue's name, summary, deck or timebox.
 *
 * Only the columns the client holds a grant on — status, round, estimate and
 * slug are not among them, so this cannot move the round. Owner-only, via the
 * `issues_update_owner` policy.
 *
 * Changing the deck once cards are down is refused by the
 * `poko_issues_before_update` trigger, not by a check here, so it holds however
 * the update arrives.
 */
export async function updateIssue(
  issueId: string,
  draft: IssueDraft
): Promise<IssueResult> {
  const fields = validateDraft(draft)
  if (!fields.ok) return { formError: fields.formError }

  const supabase = await createClient()

  const sprint = await resolveSprint(supabase, fields.sprintName)
  if (!sprint.ok) return { formError: sprint.formError }

  const { data, error } = await supabase
    .from("issues")
    .update({
      name: fields.name,
      key: fields.key,
      sprint_id: sprint.sprintId,
      summary: fields.summary,
      deck_name: fields.deckName,
      deck_values: fields.values,
      round_duration_seconds: draft.timeboxSeconds,
    })
    .eq("id", issueId)
    .select("slug")

  if (error) return { formError: describe(error) }
  if (!data?.length) {
    return { formError: "That issue is gone, or isn't yours to edit." }
  }

  revalidateIssue()
  return {}
}

/**
 * Deletes an issue and everything hanging off it — seats, every round's cards,
 * and everyone's ordering of it — in one cascade. There is no undo and no soft
 * delete, which is why the UI puts a confirmation in front of it.
 *
 * Owner only, enforced by the `issues_delete_owner` policy rather than checked
 * here: a participant calling this simply matches no rows.
 */
export async function deleteIssue(issueId: string): Promise<IssueResult> {
  const supabase = await createClient()

  // `.select()` so we can tell "deleted" from "matched nothing". RLS turns a
  // non-owner's delete into zero rows rather than an error, which would
  // otherwise look like success.
  const { data, error } = await supabase
    .from("issues")
    .delete()
    .eq("id", issueId)
    .select("id")

  if (error) return { formError: describe(error) }
  if (!data?.length) {
    return { formError: "That issue is already gone, or isn't yours to delete." }
  }

  revalidateIssue()
  return {}
}

/** Which issues a bulk clear takes with it. */
export type ClearScope = "voted" | "all"

export type ClearIssuesResult = IssueResult & {
  /** How many rows actually went, so the toast can say something true. */
  cleared?: number
}

/**
 * Clears your issues in one go — either the ones that have been voted on, or
 * the lot.
 *
 * An ordinary filtered delete rather than a security-definer routine: the
 * `issues_delete_owner` policy already narrows this to issues you own, so a
 * bulk delete can only ever reach your own rows. Issues you merely have a seat
 * at match nothing and are silently left alone, which is the behaviour we
 * want — and it is the same policy the single-row delete leans on, rather than
 * a second, parallel rule that could drift from it.
 *
 * `owner_id` is in the filter as well, even though the policy makes it
 * redundant. PostgREST refuses an unfiltered delete, so this needs SOME
 * predicate, and "mine" is the honest one to write: it says in the query what
 * the UI promises.
 */
export async function clearIssues(
  scope: ClearScope
): Promise<ClearIssuesResult> {
  // A server action is a public endpoint, and the two scopes differ by an
  // entire table. Anything unrecognised is refused rather than defaulted —
  // defaulting the wrong way here deletes issues that were never asked for.
  if (scope !== "voted" && scope !== "all") {
    return { formError: "That isn't something we can clear." }
  }

  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null

  if (!userId) return { formError: "Sign in before clearing your issues." }

  const mine = supabase.from("issues").delete().eq("owner_id", userId)

  const { data: removed, error } = await (scope === "voted"
    ? mine.eq("status", "closed")
    : mine
  ).select("id")

  if (error) return { formError: describe(error) }

  revalidateIssue()
  return { cleared: removed?.length ?? 0 }
}

/**
 * Stores the order you just dragged your list into.
 *
 * Takes the whole list rather than "move this one to index N": the panel
 * already knows the order it is rendering, one statement is atomic where a
 * read-modify-write pair is not, and it means a list that has drifted for any
 * reason is repaired by the next drop.
 *
 * The order is yours alone — `issue_order` is keyed on the viewer — so this is
 * safe to call for issues you merely have a seat at. `reorder_issues` drops
 * any id you cannot see rather than refusing the call, so a stale tab still
 * saves the rest of its order.
 */
export async function reorderIssues(
  issueIds: string[]
): Promise<IssueResult> {
  const supabase = await createClient()

  const { error } = await supabase.rpc("reorder_issues", {
    p_issue_ids: issueIds,
  })

  if (error) return { formError: describe(error) }

  revalidateIssue()
  return {}
}

/**
 * Starts the round's clock.
 *
 * Separate from creating the issue on purpose: a countdown that began when the
 * dialog closed would already be running before anyone had read the story or
 * followed the invite link.
 */
export async function startRound(issueId: string): Promise<IssueResult> {
  const supabase = await createClient()

  const { error } = await supabase.rpc("start_round", { p_issue_id: issueId })
  if (error) return { formError: describe(error) }

  revalidateIssue()
  return {}
}

/**
 * Ends the round and reveals every card at once.
 *
 * The estimate is not passed in — `close_round` works it out, and records one
 * only if every card matches. An estimate the team did not agree on is not an
 * estimate.
 */
export async function closeRound(issueId: string): Promise<IssueResult> {
  const supabase = await createClient()

  const { error } = await supabase.rpc("close_round", { p_issue_id: issueId })
  if (error) return { formError: describe(error) }

  revalidateIssue()
  return {}
}

/** Starts a fresh pass. The previous round's cards are kept, not deleted. */
export async function reopenRound(issueId: string): Promise<IssueResult> {
  const supabase = await createClient()

  const { error } = await supabase.rpc("reopen_round", { p_issue_id: issueId })
  if (error) return { formError: describe(error) }

  revalidateIssue()
  return {}
}

/**
 * Takes a seat at an issue from its invite link.
 *
 * Possession of the slug is the invitation — there is no RLS formulation of
 * "you may read the row whose slug you can name" — so joining goes through the
 * `join_issue` function rather than a direct insert. It is idempotent, so
 * re-opening the link is harmless.
 *
 * This runs as a server action rather than in the browser on purpose: the
 * session cookie set by `signInAnonymously` goes out on this response, so the
 * next request renders as a participant. Signing in from the browser would
 * leave the already-rendered server tree stale and open a window where the
 * browser holds a session the server doesn't know about.
 */
export async function joinRoom(
  slug: string,
  displayName: string
): Promise<IssueResult> {
  const name = displayName.trim()
  if (!name) return { formError: "Pick a name your team will recognise." }

  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()

  // Someone already signed in joins under their own account. This guard is
  // essential rather than tidy: signInAnonymously does not refuse when a
  // session exists, it REPLACES it — so without it, clicking a colleague's
  // invite would quietly sign you out of your own account into a throwaway one.
  if (!data?.claims) {
    const { error } = await supabase.auth.signInAnonymously({
      // Display only, and only used to seed the seat name below.
      options: { data: { full_name: name } },
    })

    if (error) {
      // The project allows a limited number of guests per hour per IP, and a
      // whole team shares one office address.
      return {
        formError: /rate limit|too many/i.test(error.message)
          ? "A lot of people have joined from this network in the last hour. Try again shortly."
          : error.message,
      }
    }
  }

  const { error } = await supabase.rpc("join_issue", {
    p_slug: slug,
    p_display_name: name,
  })

  if (error) return { formError: describe(error) }

  // The header now shows a name and the room has become readable, so the whole
  // tree needs re-rendering — same shape as signIn in lib/auth/actions.ts.
  revalidatePath("/", "layout")
  redirect(`/room/${slug}`)
}

/**
 * Re-renders the dashboard so the server's view of the round wins.
 *
 * Needed on the vote path today because a card can close the round out from
 * under the person who played it. Step 6 replaces this with the realtime
 * broadcast, which tells every client at once instead of only the one that
 * acted.
 */
function revalidateIssue() {
  revalidatePath("/dashboard")
}

/**
 * Validates and normalises what the dialog sent.
 *
 * A server action is a public endpoint, so this runs regardless of what the
 * form already checked — that validation is a courtesy to the user, not a
 * control. Shared by create and update so the two can't drift apart.
 */
type ValidDraft = {
  ok: true
  name: string
  key: string | null
  sprintName: string | null
  deckName: string
  values: string[]
  summary: string | null
}

function validateDraft(
  draft: IssueDraft
): ValidDraft | { ok: false; formError: string } {
  const name = draft.name.trim()
  if (!name) return { ok: false, formError: "Give the issue a title." }

  // Blank and whitespace-only both mean "no key", and the column's CHECK
  // rejects an empty string, so normalise before it gets there. Same for the
  // sprint, where blank is how you say "uncategorised".
  const key = draft.key?.trim() || null
  if (key && key.length > maxKeyLength) {
    return {
      ok: false,
      formError: `Keep the issue key under ${maxKeyLength} characters.`,
    }
  }

  const sprintName = draft.sprintName?.trim() || null
  if (sprintName && sprintName.length > maxSprintNameLength) {
    return {
      ok: false,
      formError: `Keep the sprint name under ${maxSprintNameLength} characters.`,
    }
  }

  const deckName = draft.deck.name.trim()
  if (!deckName) return { ok: false, formError: "Give the deck a name." }

  const values = normaliseDeckValues(draft.deck.values)
  if (values.length < minDeckValues) {
    return { ok: false, formError: `A deck needs at least ${minDeckValues} cards.` }
  }
  if (values.length > maxDeckValues) {
    return {
      ok: false,
      formError: `A deck holds up to ${maxDeckValues} cards — that one has ${values.length}.`,
    }
  }

  // Blank and whitespace-only both mean "no summary", and the column's CHECK
  // rejects an empty string, so normalise before it gets there.
  const summary = draft.summary?.trim() || null
  if (summary && summary.length > maxSummaryLength) {
    return {
      ok: false,
      formError: `Keep the summary under ${maxSummaryLength} characters — link to the ticket for the detail.`,
    }
  }

  return { ok: true, name, key, sprintName, deckName, values, summary }
}

/** Trim, drop blanks, drop repeats — mirrors the deck CHECK on `issues`. */
function normaliseDeckValues(values: string[]) {
  const seen = new Set<string>()

  for (const raw of values) {
    const value = raw.trim()
    if (value) seen.add(value)
  }

  return [...seen]
}

/**
 * Postgres and PostgREST errors are terse and leak schema detail; give the ones
 * a user can actually hit real copy. Same shape as `describe()` in
 * `lib/auth/actions.ts`.
 *
 * The `hint` values come from the guard triggers in the migration, which set
 * them precisely so the client can branch without parsing prose.
 */
function describe(error: { code?: string; hint?: string | null; message: string }) {
  switch (error.hint) {
    case "poko_round_closed":
      return "This round just closed — the cards are already on the table."
    case "poko_round_expired":
      return "Time's up on this round."
    case "poko_stale_round":
      return "This round was reopened while you were choosing. Have another look."
    case "poko_value_not_in_deck":
      return "That card isn't in this issue's deck."
    case "poko_not_participant":
      return "You're not at this table."
    case "poko_not_owner":
      return "Only the person who created the issue can do that."
    case "poko_no_timebox":
      return "This issue has no timebox to start."
    case "poko_issue_closed":
      return "Reopen the round before editing this issue."
    case "poko_deck_locked":
      return "Cards are already down — the deck can't change mid-round."
    case "poko_room_missing":
      return "That invite link doesn't match an issue."
    case "poko_not_signed_in":
      return "Sign in before joining an issue."
    case "poko_sprint_not_yours":
      return "That sprint isn't yours to file an issue in."
    case "poko_order_missing":
    case "poko_order_too_long":
      return "Couldn't save that order. Reload and try again."
  }

  // 42501 is an RLS or grant denial; PGRST116 is "no rows" from a .single().
  if (error.code === "42501") return "You don't have access to that issue."
  if (error.code === "PGRST116") return "That issue no longer exists."
  if (error.code === "23514") return "That deck isn't valid."

  return error.message
}
