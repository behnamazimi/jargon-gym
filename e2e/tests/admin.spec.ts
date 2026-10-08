import { test, expect } from "../fixtures";
import { sql } from "../support/db";
import { APP_URL } from "../support/env";
import { stub } from "../support/stub-client";
import { gotoReady } from "../support/navigation";

test.describe("Admin area", () => {
  test("a member does not see the admin area", async ({ page, user }) => {
    expect(user.id).toBeTruthy();
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  });

  test.describe("as an admin", () => {
    test.use({ storageState: "e2e/.auth/admin.json" });

    test("the overview and the audit log open", async ({ page }) => {
      await gotoReady(page, "/admin");
      const nav = page.getByRole("navigation", { name: "Admin" });
      await expect(nav).toBeVisible();

      await nav.getByRole("link", { name: "Audit log" }).click();
      await expect(page).toHaveURL(/\/admin\/system\/audit/);
    });

    test("approving a waitlist request sends an invite", async ({ page, browser }) => {
      const email = `waitlist-${crypto.randomUUID()}@lobyas.test`;
      // A new context inherits this describe's admin session, so start the visitor signed out.
      const visitor = await browser.newContext({
        baseURL: APP_URL,
        storageState: { cookies: [], origins: [] },
      });
      const form = await visitor.newPage();
      await gotoReady(form, "/request-access");
      await form.getByLabel("Email").fill(email);
      await form.getByRole("button", { name: /request/i }).click();
      await expect
        .poll(
          async () =>
            (await sql("select 1 from public.waitlist_requests where email = $1", [email])).length,
        )
        .toBe(1);
      await visitor.close();

      await gotoReady(page, `/admin/people?q=${encodeURIComponent(email)}`);
      await page.getByRole("searchbox", { name: "Search by email" }).fill(email);
      await page.getByRole("button", { name: "Search", exact: true }).click();
      await page
        .getByRole("row", { name: new RegExp(email) })
        .getByRole("checkbox")
        .check();
      await page.getByRole("button", { name: /Approve selected/ }).click();
      await page
        .getByRole("alertdialog")
        .getByRole("button", { name: "Approve and email" })
        .click();

      await expect
        .poll(async () => (await stub.outbox()).some((mail) => mail.to.includes(email)))
        .toBe(true);
    });
  });
});
