import { test as base, expect } from "@playwright/test";
import { APP_URL } from "./support/env";
import { createUser, signInContext, type TestUser } from "./support/users";

type Fixtures = {
  /** A fresh member with their own data, already signed in on `page`. */
  user: TestUser;
  /** Fails the test on an uncaught error in the page. */
  pageErrors: string[];
};

export const test = base.extend<Fixtures>({
  context: async ({ context }, use) => {
    // Declined analytics, so the banner never covers the controls.
    await context.addCookies([{ name: "lb_consent", value: "denied", url: APP_URL }]);
    await use(context);
  },

  pageErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => {
        // Serwist's registration reads a registration that a blocked service worker never returns.
        if (error.message.includes("reading 'waiting'")) return;
        errors.push(error.message);
      });
      await use(errors);
      expect(errors, "uncaught errors in the page").toEqual([]);
    },
    { auto: true },
  ],

  user: async ({ context }, use) => {
    const user = await createUser();
    await signInContext(context, user);
    await use(user);
  },
});

export { expect };
