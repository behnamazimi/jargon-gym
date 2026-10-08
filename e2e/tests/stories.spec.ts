import { test, expect } from "../fixtures";
import { creditsLeft } from "../support/credits";
import { sql } from "../support/db";
import { gotoReady } from "../support/navigation";
import { seedCollection } from "../support/seed";

test.describe("Stories", () => {
  test("a story is written from the queue, costs credits and counts as reading", async ({
    page,
    user,
  }) => {
    const { domainId } = await seedCollection(user);
    const before = await creditsLeft(user.id);
    await gotoReady(page, `/app/read/stories?domain=${domainId}`);

    await page.getByRole("button", { name: "Write a story" }).click();
    await expect(page.getByRole("heading", { name: "A Day At Work" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Terms in this piece (8)" })).toBeVisible();
    expect(await creditsLeft(user.id)).toBeLessThan(before);

    await page.getByRole("button", { name: "Mark as read" }).click();
    await expect
      .poll(async () => {
        const [row] = await sql<{ read: string }>(
          "select count(*) filter (where read_count > 0) as read from public.review_state where user_id = $1",
          [user.id],
        );
        return Number(row!.read);
      })
      .toBe(8);
  });
});
