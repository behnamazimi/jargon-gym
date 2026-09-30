-- Narration can be made by Murf (primary) or ElevenLabs (fallback). Each
-- provider has its own switch on both narration features, and the clip and
-- every provider call record which provider was used.

alter table public.ai_feature_settings
  add column murf_enabled boolean not null default true,
  add column elevenlabs_enabled boolean not null default true;

alter table public.audio_jobs
  add column provider text,
  add constraint audio_jobs_provider_check check (provider in ('murf', 'elevenlabs'));

alter table public.ai_usage_events
  add column provider text,
  add constraint ai_usage_events_provider_check check (provider in ('murf', 'elevenlabs'));

create function public.admin_set_narration_provider(p_provider text, p_enabled boolean)
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
  if p_provider not in ('murf', 'elevenlabs') then
    raise exception 'Unknown narration provider';
  end if;
  if p_enabled is null then
    raise exception 'Enabled must be true or false';
  end if;

  if p_provider = 'murf' then
    update public.ai_feature_settings
    set murf_enabled = p_enabled
    where feature in ('narration_term', 'narration_story');
  else
    update public.ai_feature_settings
    set elevenlabs_enabled = p_enabled
    where feature in ('narration_term', 'narration_story');
  end if;
  get diagnostics v_rows = row_count;
  if v_rows <> 2 then
    raise exception 'Expected both narration features to exist';
  end if;

  perform public._admin_audit_insert(
    'set_narration_provider',
    'feature',
    'narration',
    jsonb_build_object('provider', p_provider, 'enabled', p_enabled)
  );
end;
$$;

revoke all on function public.admin_set_narration_provider(text, boolean) from public, anon;
grant execute on function public.admin_set_narration_provider(text, boolean) to authenticated;
