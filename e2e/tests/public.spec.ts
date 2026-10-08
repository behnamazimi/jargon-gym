import { test, expect } from "../fixtures";
import { sql } from "../support/db";
import { gotoReady } from "../support/navigation";
import { createReferralCode } from "../support/users";

test.describe("Public pages", () => {
  test("a public collection page shows its terms and a way to join", async ({ page }) => {
    await page.goto("/collections/standup");
    await expect(page.getByRole("heading", { name: "Standup", level: 1 })).toBeVisible();
    await expect(page.getByText("Blocker", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Add to my library|Sign up|Log in/ }).first(),
    ).toBeVisible();
  });

  test("the invite code in a signup link fills the form", async ({ page }) => {
    const code = await createReferralCode();
    await page.goto(`/signup?ref=${code}`);
    await expect(page.getByLabel("Invite code")).toHaveValue(code);
  });

  test("the sitemap lists the public collections", async ({ request }) => {
    const response = await request.get("/sitemap.xml");
    expect(response.ok()).toBe(true);
    expect(await response.text()).toContain("/collections/standup");
  });

  test("a signed-in member adds a public collection to their library", async ({ page, user }) => {
    await gotoReady(page, "/collections/standup");
    await page
      .getByRole("button", { name: /Add to (my )?library/ })
      .first()
      .click();

    await expect
      .poll(async () => {
        const rows = await sql(
          `select 1 from public.user_active_collections uad join public.collections d on d.id = uad.collection_id
           where uad.user_id = $1 and d.slug = 'standup'`,
          [user.id],
        );
        return rows.length;
      })
      .toBe(1);
  });
});
