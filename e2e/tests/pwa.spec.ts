import { test, expect } from "../fixtures";

test.describe("Installable app", () => {
  test.use({ serviceWorkers: "allow" });

  test("the service worker registers", async ({ page }) => {
    await page.goto("/");
    const registered = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready;
      return Boolean(registration.active);
    });
    expect(registered).toBe(true);
  });

  test("the offline page explains what still works", async ({ page }) => {
    await page.goto("/~offline");
    await expect(page.getByRole("heading", { name: "You're offline" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
  });
});
