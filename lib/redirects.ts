/** Old admin addresses, moved in the admin rework. Temporary redirects, so a revert isn't cached
 *  by browsers. Query strings are kept. */
export const LEGACY_ADMIN_REDIRECTS = [
  { source: "/admin/ai-credits", destination: "/admin/ai/credits" },
  { source: "/admin/narration", destination: "/admin/ai/narration" },
  { source: "/jargon/debug", destination: "/admin/system/queue" },
].map((redirect) => ({ ...redirect, permanent: false }));
