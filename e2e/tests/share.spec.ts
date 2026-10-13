import type { Page } from "@playwright/test";
import { test, expect } from "../fixtures";
import { sql } from "../support/db";
import { APP_URL } from "../support/env";
import { gotoReady } from "../support/navigation";
import { seedCollection, type SeedTerm } from "../support/seed";
import { createUser, signInContext } from "../support/users";

const TWELVE_TERMS: SeedTerm[] = Array.from({ length: 12 }, (_, index) => ({
  term: `Share term ${index + 1}`,
  definition: `What share term ${index + 1} means.`,
}));

/** On phones the Library header renders twice; only one is on screen. */
function shareButton(page: Page) {
  return page.getByRole("button", { name: "Share collection" }).filter({ visible: true });
}

async function shareFromLibrary(page: Page, collectionId: string) {
  await gotoReady(page, `/app/library?collection=${collectionId}`);
  await shareButton(page).click();
  const sheet = page.getByRole("dialog", { name: "Share collection" });
  await expect(sheet.getByRole("checkbox", { checked: false })).toBeVisible();
  await sheet.getByRole("checkbox").check({ force: true });
  const link = sheet.getByRole("textbox", { name: "Link to this collection" });
  await expect(link).toHaveValue(new RegExp(`/c/${collectionId}$`));
  await expect
    .poll(async () => {
      const [row] = await sql<{ visibility: string }>(
        "select visibility from public.collections where id = $1",
        [collectionId],
      );
      return row.visibility;
    })
    .toBe("shared");
  await expect(sheet.getByRole("checkbox")).toBeEnabled();
  return sheet;
}

test.describe("Sharing a collection", () => {
  test(
    "an owner shares a collection and a friend adds it from the link",
    { tag: "@smoke" },
    async ({ page, browser, user }) => {
      const { collectionId, name } = await seedCollection(user, TWELVE_TERMS);
      await shareFromLibrary(page, collectionId);

      const friend = await browser.newContext({ baseURL: APP_URL });
      await friend.addCookies([{ name: "lb_consent", value: "denied", url: APP_URL }]);
      await signInContext(friend, await createUser());
      const friendPage = await friend.newPage();
      await gotoReady(friendPage, `/c/${collectionId}`);

      await expect(friendPage.getByRole("heading", { level: 1, name })).toBeVisible();
      const terms = friendPage.getByRole("list", { name: "Terms from this collection" });
      await expect(terms.getByRole("listitem")).toHaveCount(10);
      await expect(friendPage.getByText("+2 more in this collection")).toBeVisible();

      await friendPage.getByRole("button", { name: "Add to my library" }).first().click();
      await friendPage.waitForURL(`**/app/library?collection=${collectionId}`);
      await expect(
        friendPage.getByRole("button", { name: "Copy link" }).filter({ visible: true }),
      ).toBeVisible();

      await friend.close();
    },
  );

  test("a signed-out visitor sees the terms and is asked to log in", async ({ browser, user }) => {
    const { collectionId, name } = await seedCollection(user);
    await sql("update public.collections set visibility = 'shared' where id = $1", [collectionId]);

    const visitor = await browser.newContext({
      baseURL: APP_URL,
      storageState: { cookies: [], origins: [] },
    });
    const page = await visitor.newPage();
    await gotoReady(page, `/c/${collectionId}`);

    await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
    await expect(
      page.getByRole("list", { name: "Terms from this collection" }).getByRole("listitem").first(),
    ).toBeVisible();
    const login = page.getByRole("link", { name: "Log in to add" });
    await expect(login).toHaveAttribute(
      "href",
      `/login?next=${encodeURIComponent(`/c/${collectionId}`)}`,
    );
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);

    await visitor.close();
  });

  test("stopping sharing asks first, then the link stops working", async ({ page, user }) => {
    const { collectionId } = await seedCollection(user);
    const sheet = await shareFromLibrary(page, collectionId);

    await sheet.getByRole("checkbox").click({ force: true });
    await expect(sheet.getByText("Stop sharing?")).toBeVisible();
    await expect(sheet.getByText("It leaves Browse and the link stops working.")).toBeVisible();
    await sheet.getByRole("button", { name: "Stop sharing" }).click();
    await expect(sheet.getByRole("checkbox", { checked: false })).toBeVisible();

    const response = await page.goto(`/c/${collectionId}`);
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  });

  test("a link to a blocked collection is not found", async ({ page, user }) => {
    const { collectionId } = await seedCollection(user);
    await sql("update public.collections set visibility = 'shared' where id = $1", [collectionId]);
    await sql(
      "update public.collections set share_blocked_at = now(), share_block_reason = 'rules' where id = $1",
      [collectionId],
    );
    const response = await page.goto(`/c/${collectionId}`);
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  });

  test("a built-in's link opens its public page", async ({ page }) => {
    // The seed's public `standup` collection.
    await page.goto("/c/22222222-2222-2222-2222-222222222225");
    await expect(page).toHaveURL(/\/collections\/standup$/);
  });
});
