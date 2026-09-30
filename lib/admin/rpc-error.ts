import { AdminError } from "@/lib/admin/admin-error";

/** The database raises errors with this code when the message is written for the admin to read. */
const READABLE_ERROR_CODE = "AD001";

/** Passes the message of a readable database error to the admin. Anything else is rethrown as it is. */
export function throwRpcError(error: { code?: string; message: string }): never {
  if (error.code === READABLE_ERROR_CODE) throw new AdminError(error.message);
  throw error;
}
