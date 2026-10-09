import { test, expect } from "../fixtures";
import { sql } from "../support/db";
import { gotoReady } from "../support/navigation";
import { seedCollection } from "../support/seed";

async function hasNarration(userId: string) {
  await sql(
    `insert into public.ai_feature_allowlist (feature, user_id)
     values ('narration_term', $1) on conflict do nothing`,
    [userId],
  );
  const [row] = await sql<{ allowed: boolean }>(
    "select public.has_feature_access($1, 'narration_term') as allowed",
    [userId],
  );
  return row!.allowed;
}

test.describe("Review options", () => {
  test("the narration option is saved and survives a reload", async ({ page, user }) => {
    test.skip(!(await hasNarration(user.id)), "narration is switched off in this database");
    const { collectionId } = await seedCollection(user);
    await gotoReady(page, `/app/review?collection=${collectionId}`);

    await page.getByRole("button", { name: "Review options" }).click();
    const option = page.getByRole("checkbox", { name: "Play narration when card revealed" });
    await expect(option).not.toBeChecked();
    await option.click();
    await expect(option).toBeChecked();

    await expect
      .poll(async () => {
        const [row] = await sql<{ on: boolean }>(
          "select review_narrate_on_reveal as on from public.user_settings where user_id = $1",
          [user.id],
        );
        return row?.on;
      })
      .toBe(true);

    await gotoReady(page, `/app/review?collection=${collectionId}`);
    await page.getByRole("button", { name: "Review options" }).click();
    await expect(
      page.getByRole("checkbox", { name: "Play narration when card revealed" }),
    ).toBeChecked();
  });

  test("the keep-awake option is saved and survives a reload", async ({ page, user, isMobile }) => {
    test.skip(!isMobile, "Keep screen awake is offered on touch devices only");
    const { collectionId } = await seedCollection(user);
    await gotoReady(page, `/app/review?collection=${collectionId}`);

    await page.getByRole("button", { name: "Review options" }).click();
    const option = page.getByRole("checkbox", { name: "Keep screen awake" });
    await expect(option).not.toBeChecked();
    await option.click();
    await expect(option).toBeChecked();

    await expect
      .poll(async () => {
        const [row] = await sql<{ on: boolean }>(
          "select review_keep_awake as on from public.user_settings where user_id = $1",
          [user.id],
        );
        return row?.on;
      })
      .toBe(true);

    await gotoReady(page, `/app/review?collection=${collectionId}`);
    await page.getByRole("button", { name: "Review options" }).click();
    await expect(page.getByRole("checkbox", { name: "Keep screen awake" })).toBeChecked();
  });

  test("there is no gear when nothing in it applies", async ({ page, user }) => {
    await page.addInitScript(() => {
      // @ts-expect-error simulate a browser without the Wake Lock API
      delete Navigator.prototype.wakeLock;
    });
    const { collectionId } = await seedCollection(user);
    await gotoReady(page, `/app/review?collection=${collectionId}`);

    await expect(page.getByRole("button", { name: "Recall the meaning" }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Review options" })).toHaveCount(0);
  });
});
