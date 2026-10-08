/** Old admin addresses, moved in the admin rework. Temporary redirects, so a revert isn't cached
 *  by browsers. Query strings are kept. */
export const LEGACY_ADMIN_REDIRECTS = [
  { source: "/admin/ai-credits", destination: "/admin/ai/credits" },
  { source: "/admin/invites", destination: "/admin/people?view=waitlist" },
  { source: "/admin/narration", destination: "/admin/ai/narration" },
].map((redirect) => ({ ...redirect, permanent: false }));

/** The private app moved from /jargon to /app, and the library from its index to /app/library.
 *  Order matters: the bare /jargon rule must come before the catch-all. Temporary for now so a
 *  mistake isn't cached by browsers. Query strings are kept (the library uses ?collection=). */
export const LEGACY_APP_REDIRECTS = [
  { source: "/app", destination: "/app/library" },
  { source: "/jargon", destination: "/app/library" },
  { source: "/jargon/:path*", destination: "/app/:path*" },
].map((redirect) => ({ ...redirect, permanent: false }));

/** Term pages are gone; their old addresses land on the collection. The collection's own
 *  share image lives at /collections/<slug>/opengraph-image and must stay reachable. */
export const LEGACY_TERM_PAGE_REDIRECTS = [
  {
    source: "/collections/:collectionSlug/:termSlug((?!opengraph-image$).+)",
    destination: "/collections/:collectionSlug",
    permanent: true,
  },
];
