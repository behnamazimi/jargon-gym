/**
 * Set by the proxy (lib/supabase/proxy.ts) after it verifies the request's
 * session via supabase.auth.getUser(), and unconditionally overwritten there
 * (never merged) so a client can never inject its own value. Route handlers
 * behind the proxy's matcher can trust this instead of re-verifying — never
 * trust it anywhere the proxy hasn't already run for the request.
 */
export const VERIFIED_USER_HEADER = "x-verified-user-id";
