import { test, expect } from "../fixtures";
import { sql } from "../support/db";

// A full page load that redirects mid-stream reloads the page, and the settings
// synced on load (timezone, analytics choice) must not crash the router while it
// does. The fixture's page-error guard fails the test on React error #310.
test.describe("Study pages without collections", () => {
  for (const path of [
    "/app/read",
    "/app/read/stories",
    "/app/review",
    "/app/quiz",
    "/app/triage",
  ]) {
    test(
      `${path} sends a member with no collections to the Library`,
      { tag: "@smoke" },
      async ({ page, user }) => {
        await page.goto(path);
        await expect(page).toHaveURL(/\/app\/library/);

        await expect
          .poll(async () => {
            const [row] = await sql<{ timezone: string | null; consent: string | null }>(
              "select timezone, analytics_consent as consent from public.user_settings where user_id = $1",
              [user.id],
            );
            return row ?? null;
          })
          .toEqual({ timezone: expect.any(String), consent: "denied" });
        await page.waitForLoadState("networkidle");
      },
    );
  }
});
