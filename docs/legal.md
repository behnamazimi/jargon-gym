# Legal pages, contact and account deletion

- Contact email and the Privacy/Terms links come from `lib/site.ts`. The
  footers, the phone More sheet, the signup consent line and the legal pages
  all read them from there.
- Public footer: `components/site-footer.tsx`. In-app footer
  (`components/app-footer.tsx`) shows on desktop only; phones get the same
  links at the bottom of the More sheet.
- Pages: `/about`, `/privacy`, `/terms` (text in `content/pages/*.mdx`). They must stay
  in `PUBLIC_PATH_PREFIXES` in `lib/supabase/proxy.ts` and in `app/sitemap.ts`.
- When a new service starts receiving user data (an AI vendor, email, analytics),
  update the processor list on the Privacy page. Analytics (PostHog) sits behind the
  consent banner: nothing is stored on the device or sent until the visitor allows it
  (`lib/consent/`, `components/consent/`, `lib/analytics/client.ts`). The choice is
  the `lb_consent` cookie, and for signed-in members also `user_settings.analytics_consent`
  (+ `_at`, `_version`; a refusal wins when device and account disagree, see `syncConsent`); server events and error reports also check it. AI
  request traces (with their text) are not gated yet and the Privacy page says so; plan 12 decides what to keep.
- Account deletion: Settings → Delete account calls `delete_own_account`
  (`supabase/migrations/20261005130000_delete_own_account.sql`). It deletes the
  auth user, which cascades. It refuses admins and owners whose collections other
  people use, and writes no audit row so no email is kept.
