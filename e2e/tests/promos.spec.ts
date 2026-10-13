import { test, expect } from "../fixtures";
import { sql } from "../support/db";
import { gotoReady } from "../support/navigation";
import { seedCollection } from "../support/seed";

test.describe("Promos", () => {
  test("staying on a page records the visit", async ({ page, user }) => {
    await seedCollection(user);
    await gotoReady(page, "/app/quiz");

    await expect
      .poll(
        async () => {
          const [row] = await sql<{ seen: boolean }>(
            "select 'visit:quiz' = any(promo_seen) as seen from public.user_settings where user_id = $1",
            [user.id],
          );
          return row?.seen ?? false;
        },
        { timeout: 10_000 },
      )
      .toBe(true);
  });
});
