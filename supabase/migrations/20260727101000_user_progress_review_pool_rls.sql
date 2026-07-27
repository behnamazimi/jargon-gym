-- Align user_progress RLS with mark_term_known review-pool invariant.

drop policy if exists "Users manage own progress" on public.user_progress;

create policy "Users read own progress"
  on public.user_progress for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users insert own progress in review pool"
  on public.user_progress for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.terms t
      where t.id = term_id
        and t.domain_id in (select public.telegram_review_domain_ids(auth.uid()))
    )
  );

create policy "Users update own progress in review pool"
  on public.user_progress for update
  to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.terms t
      where t.id = term_id
        and t.domain_id in (select public.telegram_review_domain_ids(auth.uid()))
    )
  );

create policy "Users delete own progress in review pool"
  on public.user_progress for delete
  to authenticated
  using (
    user_id = auth.uid()
    and exists (
      select 1
      from public.terms t
      where t.id = term_id
        and t.domain_id in (select public.telegram_review_domain_ids(auth.uid()))
    )
  );
