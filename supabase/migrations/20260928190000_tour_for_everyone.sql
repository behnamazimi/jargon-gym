-- The tour shipped marking existing accounts as done. Every account should
-- see it once, so start everyone over.
update public.user_settings set tour_status = 'pending', tour_seen = '{}';
