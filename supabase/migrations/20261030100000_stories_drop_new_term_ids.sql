-- The reader offers "mark known" on every term in a story, so the list of terms
-- that were new when it was written is not kept.
alter table public.stories drop column new_term_ids;
