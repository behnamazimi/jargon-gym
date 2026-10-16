import type { Page } from "@playwright/test";
import { test, expect } from "../fixtures";
import { APP_URL } from "../support/env";
import { gotoReady } from "../support/navigation";
import { seedCollection } from "../support/seed";

const LANDING_COOKIE = "lb-read-landing";

async function landingCookie(page: Page) {
  const cookies = await page.context().cookies();
  return cookies.find((cookie) => cookie.name === LANDING_COOKIE)?.value;
}

/** Opens Read and returns the path the proxy redirected from, or null when
 *  no redirect happened before the page rendered. */
async function openRead(page: Page, path: string) {
  const response = await page.goto(path);
  await page.waitForLoadState("networkidle");
  const from = response?.request().redirectedFrom()?.url();
  return from ? new URL(from).pathname : null;
}

test.describe("Read landing", () => {
  test("Stories by default opens Stories before Cards renders", async ({ page, user }) => {
    const { collectionId } = await seedCollection(user);
    await gotoReady(page, `/app/read?collection=${collectionId}`);

    await page.getByRole("button", { name: "Read options" }).click();
    const option = page.getByRole("checkbox", { name: "Open Stories by default" });
    await option.click();
    await expect(option).toBeChecked();
    await expect.poll(() => landingCookie(page)).toBe("stories");

    expect(await openRead(page, `/app/read?collection=${collectionId}`)).toBe("/app/read");
    await expect(page).toHaveURL(new RegExp(`/app/read/stories\\?collection=${collectionId}$`));

    expect(await openRead(page, `/app/read?view=cards&collection=${collectionId}`)).toBeNull();
    await expect(page).toHaveURL(/\/app\/read\?view=cards/);

    await page.getByRole("button", { name: "Read options" }).click();
    await page.getByRole("checkbox", { name: "Open Stories by default" }).click();
    await expect.poll(() => landingCookie(page)).toBe("cards");
    expect(await openRead(page, `/app/read?collection=${collectionId}`)).toBeNull();
  });

  test("a default turned off on another device corrects itself after one visit", async ({
    page,
    user,
  }) => {
    const { collectionId } = await seedCollection(user);
    await page.context().addCookies([{ name: LANDING_COOKIE, value: "stories", url: APP_URL }]);

    await openRead(page, `/app/read?collection=${collectionId}`);
    await expect(page).toHaveURL(/\/app\/read\/stories/);
    await expect.poll(() => landingCookie(page)).toBe("cards");

    expect(await openRead(page, `/app/read?collection=${collectionId}`)).toBeNull();
    await expect(page).toHaveURL(
      new RegExp(`/app/read\\?collection=${collectionId}(&view=cards)?$`),
    );
  });

  test("Stories by default with no cookie yet moves to Stories in the browser", async ({
    page,
    user,
  }) => {
    const { collectionId } = await seedCollection(user);
    await gotoReady(page, `/app/read?collection=${collectionId}`);
    await page.getByRole("button", { name: "Read options" }).click();
    await page.getByRole("checkbox", { name: "Open Stories by default" }).click();
    await expect.poll(() => landingCookie(page)).toBe("stories");

    await page.context().clearCookies({ name: LANDING_COOKIE });
    await page.goto(`/app/read?collection=${collectionId}`);
    await expect(page).toHaveURL(new RegExp(`/app/read/stories\\?collection=${collectionId}$`));
    await expect.poll(() => landingCookie(page)).toBe("stories");
  });

  test("an unfinished story doesn't pull Read away from Cards", async ({ page, user }) => {
    const { collectionId } = await seedCollection(user);
    await gotoReady(page, `/app/read/stories?collection=${collectionId}`);
    await page.getByRole("button", { name: "Write a story" }).click();
    await expect(page.getByRole("heading", { name: "A Day At Work" })).toBeVisible();

    await gotoReady(page, `/app/read?collection=${collectionId}`);
    await expect(page).toHaveURL(
      new RegExp(`/app/read\\?collection=${collectionId}(&view=cards)?$`),
    );
  });
});
