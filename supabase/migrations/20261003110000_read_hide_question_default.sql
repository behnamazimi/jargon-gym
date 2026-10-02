-- New accounts start with the Read card showing just the term, not "What is …?".
-- Existing rows keep whatever they have.
alter table public.user_settings
  alter column read_hide_question set default true;
