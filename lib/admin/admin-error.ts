/** An error whose message is safe to show to the admin. Anything else that
 *  fails inside an admin action is logged and shown as a generic message. */
export class AdminError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminError";
  }
}
