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
  update the processor list on the Privacy page. Adding analytics also needs a
  consent banner.
- Account deletion: Settings → Delete account calls `delete_own_account`
  (`supabase/migrations/20261005130000_delete_own_account.sql`). It deletes the
  auth user, which cascades. It refuses admins and owners whose collections other
  people use, and writes no audit row so no email is kept.
