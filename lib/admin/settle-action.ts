import type { ActionResult } from "./action";

const UNREACHABLE = "Couldn't reach the server. Reload the page and try again.";

/** Runs a server action from the browser. The action itself returns failures as
 *  a result; only the call can reject (network drop, or a stale tab after a
 *  deploy), and that becomes a result too instead of reaching the error page. */
export async function settleAdminAction<T>(
  action: () => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  try {
    return await action();
  } catch (err) {
    console.error("Admin action call failed:", err);
    return { ok: false, error: UNREACHABLE };
  }
}
