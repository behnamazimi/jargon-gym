# Page promos

A banner that points at a page the user has never visited. It shows only on
chosen pages, only once the guided tour is done, and only when a condition holds.

## Where things live

- `lib/promos/promos.ts` — the registry. One entry per promo: the page it
  promotes (`target`), the pages it shows on (`showOn`), `priority`, a
  `condition`, `snoozeDays` and its copy. Add a promo here and nothing else.
- `lib/promos/state.ts` — pure logic. `eligiblePromos` needs no usage counts;
  `pickPromo` applies conditions and picks the highest priority.
- `lib/promos/settings.ts` — reads and writes. State comes from the request's
  one `user_settings` read (`getRequestUserSettingsRow`). `getPromoContext`
  calls `my_promo_usage`, which counts reviews and reads only up to
  `USAGE_CAP`, and only when a promo is otherwise eligible on that page.
- `components/promos/` — `PromoSlot` (server, in the first HTML, renders
  nothing when no promo applies), `PromoBanner` (client, dismiss only) and
  `PromoVisit` + `VisitTimer` (record a visit).
- `supabase/migrations/20261004100000_promos.sql` — `promo_seen`,
  `promo_dismissed` and the RPCs. Writes are atomic, so two tabs can't overwrite each other.

## Rules

- A page counts as visited when its `visit:<target>` key is in `promo_seen`,
  or its tour chapter is in `tour_seen`.
- A visit is recorded after 3 seconds on the page, so a bounce or prefetch
  doesn't count. That is one write per page per account, ever. The banner
  disappears on the next navigation, not mid-page.
- Dismissing stamps `promo_dismissed[id]`; the promo returns after `snoozeDays`.
- Accounts that existed when promos shipped had `promo_seen` backfilled from
  their history (Quiz, Stories) or fully (Mastery, Browse, Triage).
- The slot is mounted in layouts (Library, Review) and the Read Cards page, not
  in its own `Suspense`, so it can't pop in. Visit markers sit in the Quiz,
  Mastery, Browse and Triage layouts and the Stories page.
- Copy must not mention the admin, automation or AI; `copy.test.ts` enforces it.
