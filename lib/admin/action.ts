import { revalidatePath } from "next/cache";
import { requireAdminClient } from "@/lib/auth/require-session";
import { AdminError } from "./admin-error";

export type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };

type AdminContext = Awaited<ReturnType<typeof requireAdminClient>>;

const GENERIC_ERROR = "Something went wrong. Try again.";

/** Runs an admin server action and turns failures into a result. Next replaces
 *  the message of a thrown server action with a generic one in production, so
 *  expected failures (`AdminError`) are returned as text instead. */
export async function runAdminAction<T = void>(
  work: (context: AdminContext) => Promise<T>,
  options: { revalidate?: string[] } = {},
): Promise<ActionResult<T>> {
  try {
    const context = await requireAdminClient();
    const data = await work(context);
    for (const path of options.revalidate ?? []) revalidatePath(path);
    return { ok: true, data };
  } catch (err) {
    if (err instanceof AdminError) return { ok: false, error: err.message };
    console.error("Admin action failed:", err);
    return { ok: false, error: GENERIC_ERROR };
  }
}
