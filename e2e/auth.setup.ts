import { test as setup, expect } from "@playwright/test";
import { createUser } from "./support/users";

export const ADMIN_STATE = "e2e/.auth/admin.json";

setup("sign in an admin through the login page", async ({ page, context }) => {
  const admin = await createUser({ admin: true });
  await context.addCookies([{ name: "lb_consent", value: "denied", url: "http://127.0.0.1:3100" }]);

  await page.goto("/login");
  await page.getByLabel("Email").fill(admin.email);
  await page.getByLabel("Password").fill(admin.password);
  await page.getByRole("button", { name: "Log in with email" }).click();
  await expect(page).toHaveURL(/\/app\//);

  await context.storageState({ path: ADMIN_STATE });
});
