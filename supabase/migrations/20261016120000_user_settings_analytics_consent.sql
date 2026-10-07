-- A signed-in member's analytics choice, kept so consent can be shown later and
-- follows them to another device. The browser cookie (`lb_consent`) still
-- decides what runs on that device; this is the record. Null means no choice yet.
-- Rollback: alter table public.user_settings drop column analytics_consent,
--   drop column analytics_consent_at, drop column analytics_consent_version;
alter table public.user_settings
  add column analytics_consent text check (analytics_consent in ('granted', 'denied')),
  add column analytics_consent_at timestamptz,
  add column analytics_consent_version text;

comment on column public.user_settings.analytics_consent is
  'Analytics choice made while signed in: granted or denied. Null until chosen.';
comment on column public.user_settings.analytics_consent_version is
  'Which version of the banner wording the choice was made under, e.g. v1.';
