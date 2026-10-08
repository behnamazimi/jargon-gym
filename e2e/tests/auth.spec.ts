import { test, expect } from "../fixtures";
import { createReferralCode, createUser } from "../support/users";
import { randomUUID } from "node:crypto";

test.describe("Signing up and logging in", () => {
  test(
    "a new member signs up with an invite code and lands in the library",
    { tag: "@smoke" },
    async ({ page }) => {
      const code = await createReferralCode();
      await page.goto("/signup");
      await page.getByLabel("Email").fill(`e2e-${randomUUID()}@lobyas.test`);
      await page.getByLabel("Password").fill(`e2e${randomUUID().replace(/-/g, "")}`);
      await page.getByLabel("Invite code").fill(code);
      await page.getByRole("button", { name: "Sign up with email" }).click();

      await expect(page).toHaveURL(/\/app\/library/);
    },
  );

  test("signup refuses an unknown invite code", { tag: "@smoke" }, async ({ page }) => {
    await page.goto("/signup");
    await page.getByLabel("Email").fill(`e2e-${randomUUID()}@lobyas.test`);
    await page.getByLabel("Password").fill(`e2e${randomUUID().replace(/-/g, "")}`);
    await page.getByLabel("Invite code").fill("NOPE-NOT-A-CODE");
    await page.getByRole("button", { name: "Sign up with email" }).click();

    await expect(page).toHaveURL(/\/signup/);
    await expect(page.getByRole("alert")).toBeVisible();
  });

  test(
    "an existing member logs in with email and password",
    { tag: "@smoke" },
    async ({ page }) => {
      const member = await createUser();
      await page.goto("/login");
      await page.getByLabel("Email").fill(member.email);
      await page.getByLabel("Password").fill(member.password);
      await page.getByRole("button", { name: "Log in with email" }).click();

      await expect(page).toHaveURL(/\/app\//);
    },
  );

  test("a wrong password stays on the login page", async ({ page }) => {
    const member = await createUser();
    await page.goto("/login");
    await page.getByLabel("Email").fill(member.email);
    await page.getByLabel("Password").fill("not-the-password-1");
    await page.getByRole("button", { name: "Log in with email" }).click();

    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("alert")).toBeVisible();
  });

  test(
    "a signed-out visit to the app is sent to the login page",
    { tag: "@smoke" },
    async ({ page }) => {
      await page.goto("/app/library");
      await expect(page).toHaveURL(/\/login\?next=/);
    },
  );
});
