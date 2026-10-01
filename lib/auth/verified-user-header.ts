/**
 * Set by the proxy (lib/supabase/proxy.ts) after it verifies the request's
 * session via supabase.auth.getUser(). The proxy strips any incoming copies
 * on every request first, so a client can never inject its own value.
 * Server Components, Server Actions and route handlers behind the proxy's
 * matcher can trust these instead of re-verifying — never trust them
 * anywhere the proxy hasn't already run for the request.
 */
export const VERIFIED_USER_HEADER = "x-verified-user-id";
export const VERIFIED_USER_EMAIL_HEADER = "x-verified-user-email";
