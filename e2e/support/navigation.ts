import type { Page } from "@playwright/test";

/** Opens a page and waits for it to hydrate, so input typed straight away isn't reset by React. */
export async function gotoReady(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}
