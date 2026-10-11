import type { Page } from "@playwright/test";
import { test, expect } from "../fixtures";
import { sql } from "../support/db";
import { gotoReady } from "../support/navigation";
import { seedCollection } from "../support/seed";

async function storedGoals(userId: string) {
  const [row] = await sql<{ daily_goals: Record<string, number | null> | null }>(
    "select daily_goals from public.user_settings where user_id = $1",
    [userId],
  );
  return row?.daily_goals ?? null;
}

async function gradeGood(page: Page, times: number) {
  for (let i = 0; i < times; i++) {
    await page.getByRole("button", { name: /^Recall the meaning/ }).click();
    await page.getByRole("button", { name: /^Good/ }).click();
  }
}

test.describe("Daily goals", () => {
  test(
    "a member sets goals and meeting one celebrates it",
    { tag: "@smoke" },
    async ({ page, user, isMobile }) => {
      const { collectionId } = await seedCollection(user);
      await gotoReady(page, "/app/library");
      if (isMobile) {
        await page
          .getByRole("navigation", { name: "Primary" })
          .getByRole("button", { name: "More" })
          .click();
        await page.getByRole("link", { name: "Goals" }).click();
      } else {
        await page.getByRole("button", { name: "Account menu" }).click();
        await page.getByRole("menuitem", { name: "Goals" }).click();
      }
      await expect(page).toHaveURL(/\/app\/goals/);

      await page
        .getByRole("radiogroup", { name: "Review pace" })
        .getByRole("radio", { name: "Light" })
        .click();
      await page.getByRole("button", { name: "Fewer cards a day" }).click();
      await page.getByRole("button", { name: "Start these goals" }).click();
      await expect.poll(() => storedGoals(user.id)).toEqual({ read: 20, review: 5, quiz: 10 });

      await gotoReady(page, `/app/review?collection=${collectionId}`);
      await gradeGood(page, 5);

      const dialog = page.getByRole("dialog");
      await expect(dialog.getByRole("heading", { name: "Review goal done!" })).toBeVisible();
      await dialog.getByRole("link", { name: /^Go to Quiz/ }).click();
      await expect(page).toHaveURL(/\/app\/quiz/);
    },
  );

  test("the last goal of the day celebrates once", async ({ page, user }) => {
    const { collectionId } = await seedCollection(user);
    await sql(
      `insert into public.user_settings (user_id, daily_goals)
       values ($1, '{"read": null, "review": 1, "quiz": null}')
       on conflict (user_id) do update set daily_goals = excluded.daily_goals`,
      [user.id],
    );

    await gotoReady(page, `/app/review?collection=${collectionId}`);
    await gradeGood(page, 1);
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Today's goals done!" })).toBeVisible();
    await dialog.getByRole("button", { name: "Done for today" }).click();
    await expect(dialog).toBeHidden();

    await gotoReady(page, `/app/review?collection=${collectionId}`);
    await gradeGood(page, 1);
    await expect
      .poll(async () => {
        const [row] = await sql<{ count: string }>(
          "select count(distinct term_id) as count from public.review_events where user_id = $1 and grade is not null",
          [user.id],
        );
        return Number(row!.count);
      })
      .toBe(2);
    // A claim runs after the grade is saved and may retry 2 s later, so give
    // a second dialog the time it would need to show up before checking.
    await page.waitForTimeout(3000);
    await expect(page.getByRole("dialog")).toBeHidden();
    const [settings] = await sql<{ goal_celebrated: { tiers: string[] } }>(
      "select goal_celebrated from public.user_settings where user_id = $1",
      [user.id],
    );
    expect(settings?.goal_celebrated.tiers).toEqual(["review"]);
  });
});
