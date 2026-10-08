-- Indexes another index already covers. Checked on a copy with realistic data:
-- the same queries pick the covering index and the plans keep their shape.

-- collection_id is the leading column of terms_collection_term_idx and
-- terms_collection_slug_idx.
drop index public.terms_collection_id_idx;

-- chat_id and link_token_hash are unique columns, so their unique indexes
-- already serve every lookup.
drop index public.telegram_links_chat_id_idx;
drop index public.telegram_links_pending_token_idx;

-- code is unique.
drop index public.referral_codes_active_unused_idx;

-- Nothing filters review_events by event and time without a user; the biggest
-- index on the table that grows fastest.
drop index public.review_events_event_created_idx;
