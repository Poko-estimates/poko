-- Deleting a sprint, and deciding what becomes of what was in it.
--
-- A sprint is a container, so deleting one is really two decisions: lose the
-- sprint, and do WHAT with its issues. The sidebar asks before it acts, and
-- this is the routine that carries out the answer:
--
--   'uncategorize'  the issues stay, and fall into Uncategorized
--   'move'          the issues go to another of your sprints
--   'delete'        the issues go too, with every card played in them
--
-- Why an RPC rather than the two statements the client could send itself: each
-- answer is "do something to the issues, THEN drop the sprint", and a client
-- doing that in two calls can be interrupted between them — leaving issues
-- already moved or already deleted while the sprint they came from is still
-- standing. One function is one transaction, so the pair either both happen or
-- neither does.
--
-- It also puts the rules where they cannot be skipped: that the sprint is
-- yours, that a move names a different sprint which is also yours, and that
-- 'delete' really was asked for rather than arrived at by a typo in the
-- disposition. A server action is a public endpoint, and this one is the most
-- destructive in the app.

create function public.delete_sprint(p_sprint_id uuid,
                                     p_issues text,
                                     p_target_sprint_id uuid default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid    uuid := (select auth.uid());
  v_sprint public.sprints;
  v_count  integer := 0;
begin
  if v_uid is null then
    raise exception 'poko: sign in first'
      using errcode = '28000', hint = 'poko_not_signed_in';
  end if;

  -- Nothing is assumed about an unrecognised disposition. The three branches
  -- below differ by "your issues survive" versus "your issues are gone", so
  -- there is no safe default to fall through to.
  if p_issues is null or p_issues not in ('uncategorize', 'move', 'delete') then
    raise exception 'poko: % is not something to do with the issues', p_issues
      using errcode = 'P0001', hint = 'poko_bad_disposition';
  end if;

  -- FOR UPDATE so a second call cannot interleave with this one and act on a
  -- sprint that is already on its way out.
  select * into v_sprint
    from public.sprints
   where id = p_sprint_id
     for update;

  if not found or v_sprint.owner_id <> v_uid then
    raise exception 'poko: that sprint is not yours to delete'
      using errcode = '42501', hint = 'poko_not_owner';
  end if;

  if p_issues = 'move' then
    if p_target_sprint_id is null or p_target_sprint_id = p_sprint_id then
      raise exception 'poko: moving the issues needs a different sprint'
        using errcode = 'P0001', hint = 'poko_bad_target';
    end if;

    if not exists (
      select 1 from public.sprints s
       where s.id = p_target_sprint_id
         and s.owner_id = v_uid
    ) then
      raise exception 'poko: that sprint is not yours'
        using errcode = '42501', hint = 'poko_sprint_not_yours';
    end if;

    -- `where sprint_id = p_sprint_id` cannot reach anybody else's issues:
    -- poko_issue_sprint_is_owned only ever lets an issue into a sprint with
    -- the same owner, so everything in this sprint belongs to the caller.
    -- That invariant is what makes an unfiltered-by-owner update safe here.
    --
    -- The before-update trigger still fires, which is the point: it re-checks
    -- that the destination is the issue owner's. Moving a CLOSED issue is
    -- allowed on purpose — filing a settled estimate is housekeeping, not a
    -- rewrite of the round.
    update public.issues
       set sprint_id = p_target_sprint_id
     where sprint_id = p_sprint_id;

    get diagnostics v_count = row_count;

  elsif p_issues = 'delete' then
    delete from public.issues where sprint_id = p_sprint_id;
    get diagnostics v_count = row_count;

  else
    -- 'uncategorize' needs no write of its own: issues.sprint_id is ON DELETE
    -- SET NULL, so dropping the sprint below unassigns them. Counted first,
    -- because after the delete there is nothing left to count.
    select count(*) into v_count
      from public.issues
     where sprint_id = p_sprint_id;
  end if;

  delete from public.sprints where id = p_sprint_id;

  return v_count;
end;
$$;

revoke all on function public.delete_sprint(uuid, text, uuid) from public, anon;
grant execute on function public.delete_sprint(uuid, text, uuid) to authenticated;
