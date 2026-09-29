-- Admin phase 4 (expand): an audit log and the admin writes that must be
-- atomic. Additive: nothing in the deployed app calls any of this yet. The two
-- AI credit admin functions are replaced with the same signature and behavior,
-- plus an audit row in the same transaction.
--
-- Rollback (as a new migration, history is append-only): drop the functions
-- created here, restore admin_grant_ai_credits and admin_reset_ai_credits from
-- 20260929120000_ai_credits.sql (same bodies without the
-- _admin_audit_insert call), then drop table public.admin_audit_log. Dropping
-- the table loses any history recorded after this deployed.

-- ---------------------------------------------------------------------------
-- Audit log. Written only by the functions below; clients can only read it.
-- ---------------------------------------------------------------------------

create table public.admin_audit_log (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  actor_id uuid references public.users (id) on delete set null,
  -- A snapshot, so the record still says who acted after an account is deleted.
  actor_email text,
  action text not null check (char_length(action) between 1 and 100),
  target_type text check (target_type is null or char_length(target_type) <= 50),
  target_id text check (target_id is null or char_length(target_id) <= 100),
  details jsonb not null default '{}' check (jsonb_typeof(details) = 'object')
);

create index admin_audit_log_created_at_idx on public.admin_audit_log (created_at desc);

alter table public.admin_audit_log enable row level security;

create policy "Admins read admin audit log"
  on public.admin_audit_log for select
  to authenticated
  using (public.is_admin());

revoke all on table public.admin_audit_log from public, anon, authenticated, service_role;
revoke all on sequence public.admin_audit_log_id_seq from public, anon, authenticated, service_role;
grant select on public.admin_audit_log to authenticated;

-- The one place that writes a row. The actor always comes from the session.
create function public._admin_audit_insert(
  p_action text,
  p_target_type text,
  p_target_id text,
  p_details jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
begin
  select u.email into v_email from public.users u where u.id = auth.uid();

  insert into public.admin_audit_log (actor_id, actor_email, action, target_type, target_id, details)
  values (auth.uid(), v_email, p_action, p_target_type, p_target_id, coalesce(p_details, '{}'::jsonb));
end;
$$;

revoke all on function public._admin_audit_insert(text, text, text, jsonb)
  from public, anon, authenticated, service_role;

-- For changes the app makes without one of the functions below. Its actions
-- all start with "app.", so they can't pose as the ones written here.
create function public.admin_write_audit(
  p_action text,
  p_target_type text default null,
  p_target_id text default null,
  p_details jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Only admins can write the audit log';
  end if;
  if p_action is null or p_action not like 'app.%' or char_length(p_action) > 100 then
    raise exception 'Audit actions from the app must start with "app." and be at most 100 characters';
  end if;
  if p_details is null or jsonb_typeof(p_details) <> 'object' or octet_length(p_details::text) > 4096 then
    raise exception 'Audit details must be a JSON object of at most 4096 bytes';
  end if;

  perform public._admin_audit_insert(p_action, p_target_type, p_target_id, p_details);
end;
$$;

revoke all on function public.admin_write_audit(text, text, text, jsonb) from public, anon;
grant execute on function public.admin_write_audit(text, text, text, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Every collection with its owner and term count, for the admin list. Reads
-- go through here because the table's row level security only lets an admin
-- see their own, shared and public collections, not other people's private
-- ones. Counts are grouped in the database. Collections with no terms show 0.
-- ---------------------------------------------------------------------------

create function public.admin_list_collections()
returns table (
  id uuid,
  name text,
  owner_id uuid,
  owner_email text,
  visibility public.domain_visibility,
  is_builtin boolean,
  is_public boolean,
  slug text,
  term_count bigint,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Only admins can list all collections';
  end if;

  return query
  select d.id, d.name, d.owner_id, u.email, d.visibility, d.is_builtin, d.is_public, d.slug,
         (select count(*) from public.terms t where t.domain_id = d.id),
         d.created_at, d.updated_at
  from public.domains d
  left join public.users u on u.id = d.owner_id
  order by d.name;
end;
$$;

revoke all on function public.admin_list_collections() from public, anon;
grant execute on function public.admin_list_collections() to authenticated;

-- ---------------------------------------------------------------------------
-- Publish a collection in one transaction. The app builds the slugs (one slug
-- algorithm, in TypeScript); this checks and applies them. It refuses to go
-- public while any term still has no slug, so a term added after the app
-- looked makes it fail and the app tries again.
-- ---------------------------------------------------------------------------

create function public.admin_publish_collection(
  p_domain_id uuid,
  p_domain_slug text,
  p_term_slugs jsonb
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_domain public.domains;
  v_slug text;
  v_pair record;
  v_missing integer;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Only admins can publish collections';
  end if;
  if p_term_slugs is null or jsonb_typeof(p_term_slugs) <> 'object' then
    raise exception 'Term slugs must be a JSON object';
  end if;
  if (select count(*) from jsonb_object_keys(p_term_slugs)) > 20000 then
    raise exception 'Too many term slugs';
  end if;

  select * into v_domain from public.domains where id = p_domain_id for update;
  if not found then
    raise exception 'Collection not found.';
  end if;
  if not v_domain.is_builtin then
    raise exception 'Only built-in collections can be made public.';
  end if;

  v_slug := coalesce(nullif(v_domain.slug, ''), p_domain_slug);
  if v_slug is null or v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or char_length(v_slug) > 200 then
    raise exception 'The collection slug is not valid.';
  end if;

  for v_pair in select e.key, e.value from jsonb_each_text(p_term_slugs) e loop
    if v_pair.key !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      raise exception 'Term ids must be uuids.';
    end if;
    if jsonb_typeof(p_term_slugs -> v_pair.key) <> 'string'
       or v_pair.value !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or char_length(v_pair.value) > 200 then
      raise exception 'A term slug is not valid.';
    end if;
  end loop;

  if (select count(distinct e.value) from jsonb_each_text(p_term_slugs) e)
     <> (select count(*) from jsonb_each_text(p_term_slugs)) then
    raise exception 'Two terms were given the same slug.';
  end if;

  if exists (
    select 1
    from jsonb_each_text(p_term_slugs) e
    where not exists (
      select 1 from public.terms t where t.id = e.key::uuid and t.domain_id = p_domain_id
    )
  ) then
    raise exception 'A slug was given for a term that is not in this collection.';
  end if;

  update public.domains
  set slug = v_slug
  where id = p_domain_id and (slug is null or slug = '');

  update public.terms t
  set slug = e.value
  from jsonb_each_text(p_term_slugs) e
  where t.id = e.key::uuid
    and t.domain_id = p_domain_id
    and (t.slug is null or t.slug = '');

  select count(*) into v_missing
  from public.terms t
  where t.domain_id = p_domain_id and (t.slug is null or t.slug = '');
  if v_missing > 0 then
    -- A serialization failure, so the app can tell "read again and retry" from real errors.
    raise exception 'Some terms have no slug yet. Try again.' using errcode = '40001';
  end if;

  update public.domains set is_public = true where id = p_domain_id;

  perform public._admin_audit_insert(
    'publish_collection', 'domain', p_domain_id::text,
    jsonb_build_object('slug', v_slug, 'terms_slugged', (select count(*) from jsonb_object_keys(p_term_slugs)))
  );

  return v_slug;
end;
$$;

revoke all on function public.admin_publish_collection(uuid, text, jsonb) from public, anon;
grant execute on function public.admin_publish_collection(uuid, text, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Narration and AI credit settings, each written in one transaction.
-- ---------------------------------------------------------------------------

create function public.admin_set_narration_enabled(p_enabled boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows integer;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Only admins can change narration settings';
  end if;
  if p_enabled is null then
    raise exception 'Enabled must be true or false';
  end if;

  update public.ai_feature_settings
  set enabled = p_enabled
  where feature in ('narration_term', 'narration_story');
  get diagnostics v_rows = row_count;
  if v_rows <> 2 then
    raise exception 'Expected both narration features to exist';
  end if;

  perform public._admin_audit_insert(
    'set_narration_enabled', 'feature', 'narration', jsonb_build_object('enabled', p_enabled)
  );
end;
$$;

revoke all on function public.admin_set_narration_enabled(boolean) from public, anon;
grant execute on function public.admin_set_narration_enabled(boolean) to authenticated;

-- A blank term cap means no cap; stories always keep one.
create function public.admin_set_narration_caps(p_term_cap integer, p_story_cap integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows integer;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Only admins can change narration settings';
  end if;
  if p_story_cap is null or p_story_cap not between 1 and 1000 then
    raise exception 'The story cap must be between 1 and 1000';
  end if;
  if p_term_cap is not null and p_term_cap not between 1 and 1000 then
    raise exception 'The term cap must be between 1 and 1000, or empty for no cap';
  end if;

  update public.ai_feature_settings
  set daily_cap = case feature when 'narration_term' then p_term_cap else p_story_cap end
  where feature in ('narration_term', 'narration_story');
  get diagnostics v_rows = row_count;
  if v_rows <> 2 then
    raise exception 'Expected both narration features to exist';
  end if;

  perform public._admin_audit_insert(
    'set_narration_caps', 'feature', 'narration',
    jsonb_build_object('term_cap', p_term_cap, 'story_cap', p_story_cap)
  );
end;
$$;

revoke all on function public.admin_set_narration_caps(integer, integer) from public, anon;
grant execute on function public.admin_set_narration_caps(integer, integer) to authenticated;

create function public.admin_set_ai_credit_settings(
  p_default_allowance integer,
  p_monthly_refill integer,
  p_quiz_cost integer,
  p_story_cost integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old public.ai_credit_settings;
  v_old_quiz integer;
  v_old_story integer;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Only admins can change AI credit settings';
  end if;
  if p_default_allowance is null or p_default_allowance not between 0 and 1000000
     or p_monthly_refill is null or p_monthly_refill not between 0 and 1000000 then
    raise exception 'Allowances must be between 0 and 1000000';
  end if;
  if p_quiz_cost is null or p_quiz_cost not between 1 and 1000
     or p_story_cost is null or p_story_cost not between 1 and 1000 then
    raise exception 'Costs must be between 1 and 1000';
  end if;

  select * into v_old from public.ai_credit_settings where id for update;
  select credit_cost into v_old_quiz from public.ai_feature_settings where feature = 'quiz' for update;
  select credit_cost into v_old_story from public.ai_feature_settings where feature = 'story' for update;
  if v_old.id is null or v_old_quiz is null or v_old_story is null then
    raise exception 'AI credit settings are not set up';
  end if;

  update public.ai_credit_settings
  set default_allowance = p_default_allowance, monthly_refill = p_monthly_refill
  where id;
  update public.ai_feature_settings set credit_cost = p_quiz_cost where feature = 'quiz';
  update public.ai_feature_settings set credit_cost = p_story_cost where feature = 'story';

  perform public._admin_audit_insert(
    'set_ai_credit_settings', 'settings', 'ai_credits',
    jsonb_build_object(
      'old', jsonb_build_object(
        'default_allowance', v_old.default_allowance, 'monthly_refill', v_old.monthly_refill,
        'quiz_cost', v_old_quiz, 'story_cost', v_old_story
      ),
      'new', jsonb_build_object(
        'default_allowance', p_default_allowance, 'monthly_refill', p_monthly_refill,
        'quiz_cost', p_quiz_cost, 'story_cost', p_story_cost
      )
    )
  );
end;
$$;

revoke all on function public.admin_set_ai_credit_settings(integer, integer, integer, integer)
  from public, anon;
grant execute on function public.admin_set_ai_credit_settings(integer, integer, integer, integer)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Grant and reset keep their signature and behavior; each also leaves an audit
-- row in the same transaction. The details hold the user id, never an email.
-- ---------------------------------------------------------------------------

create or replace function public.admin_grant_ai_credits(p_user_id uuid, p_amount integer, p_note text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Only admins can grant AI credits';
  end if;
  if p_amount is null or p_amount < 1 or p_amount > 10000 then
    raise exception 'Amount must be between 1 and 10000';
  end if;

  insert into public.ai_credit_ledger (user_id, kind, amount, created_by, note)
  values (p_user_id, 'grant', p_amount, auth.uid(), nullif(trim(p_note), ''));

  perform public._admin_audit_insert(
    'grant_ai_credits', 'user', p_user_id::text,
    jsonb_build_object('amount', p_amount, 'note', nullif(trim(p_note), ''))
  );
end;
$$;

revoke all on function public.admin_grant_ai_credits(uuid, integer, text) from public, anon;
grant execute on function public.admin_grant_ai_credits(uuid, integer, text) to authenticated;

create or replace function public.admin_reset_ai_credits(p_user_id uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Only admins can reset AI credits';
  end if;

  insert into public.ai_credit_ledger (user_id, kind, amount, created_by, note)
  values (p_user_id, 'reset', 0, auth.uid(), nullif(trim(p_note), ''));

  perform public._admin_audit_insert(
    'reset_ai_credits', 'user', p_user_id::text,
    jsonb_build_object('note', nullif(trim(p_note), ''))
  );
end;
$$;

revoke all on function public.admin_reset_ai_credits(uuid, text) from public, anon;
grant execute on function public.admin_reset_ai_credits(uuid, text) to authenticated;
