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
  request traces never record prompts or answers, and carry the member's id only with consent
  (otherwise a random id): `lib/ai/observability.ts`.
- Data requests: the Privacy page promises a copy of someone's data by email within a month.
  There is no ready-made export on purpose (the tables change too often to keep one current);
  work it out when a request comes in, after checking it came from the account's own email.
  A self-serve "Download my data" button is deferred (launch audit plan 20).
- Account deletion: Settings → Delete account calls `delete_own_account`
  (`supabase/migrations/20261005130000_delete_own_account.sql`). It deletes the
  auth user, which cascades. It refuses admins and owners whose collections other
  people use, and writes no audit row so no email is kept.
