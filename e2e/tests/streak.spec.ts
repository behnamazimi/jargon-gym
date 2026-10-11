import { test, expect } from "../fixtures";
import { sql } from "../support/db";
import { gotoReady } from "../support/navigation";
import { seedCollection } from "../support/seed";
import type { TestUser } from "../support/users";

/** A 5-day streak last counted `daysAgo` days ago, on UTC days like the browser. */
async function setStreak(user: TestUser, daysAgo: number) {
  await sql(
    `update public.user_settings
        set timezone = 'UTC', current_streak = 5, longest_streak = 9,
            last_active_date = (now() at time zone 'UTC')::date - $2::int
      where user_id = $1`,
    [user.id, daysAgo],
  );
}

test.describe("Streak", () => {
  test("a streak with a missed day shows 0", { tag: "@smoke" }, async ({ page, user }) => {
    await setStreak(user, 3);
    await gotoReady(page, "/app/library");

    await expect(page.getByRole("button", { name: /^0 day streak\./ })).toBeVisible();
  });

  test("a streak waiting on today marks today as open", async ({ page, user }) => {
    await setStreak(user, 1);
    await gotoReady(page, "/app/library");

    const badge = page.getByRole("button", { name: /^5 day streak\./ });
    await expect(badge).toHaveAttribute("data-streak-today", "open");
    await badge.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("button", { name: "Today: not yet" })).toBeVisible();
  });

  test("studying today adds to the streak", async ({ page, user }) => {
    const { collectionId } = await seedCollection(user);
    await setStreak(user, 1);
    await gotoReady(page, `/app/read?collection=${collectionId}`);

    await page.getByRole("button", { name: "Show definition" }).click();
    await page.getByRole("button", { name: "Next term" }).click();
    await expect
      .poll(async () => {
        const [row] = await sql<{ current_streak: number }>(
          "select current_streak from public.user_settings where user_id = $1",
          [user.id],
        );
        return row!.current_streak;
      })
      .toBe(6);

    await page.getByRole("button", { name: /^5 day streak\./ }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("button", { name: "Today: studied" })).toBeVisible();
    await expect(dialog.getByText("6 day streak")).toBeVisible();
    await expect(page.getByRole("button", { name: /^6 day streak\./ })).toHaveAttribute(
      "data-streak-today",
      "done",
    );
  });
});
