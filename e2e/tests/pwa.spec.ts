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
});
