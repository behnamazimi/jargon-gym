/** Off in local development unless NEXT_PUBLIC_POSTHOG_ENABLED=true is set. */
export const analyticsEnabled =
  process.env.NODE_ENV === "production" || process.env.NEXT_PUBLIC_POSTHOG_ENABLED === "true";
