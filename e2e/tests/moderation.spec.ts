import { test, expect } from "../fixtures";
import { sql } from "../support/db";
import { gotoReady } from "../support/navigation";
import { seedCollection } from "../support/seed";
import { createUser, signInContext } from "../support/users";
import { APP_URL } from "../support/env";

test.describe("Shared collections", () => {
  test("a reported collection can be taken down by an admin", async ({ browser, user }) => {
    const { collectionId, name } = await seedCollection(user);
    await sql("update public.collections set visibility = 'shared' where id = $1", [collectionId]);

    const reporter = await browser.newContext({ baseURL: APP_URL });
    await reporter.addCookies([{ name: "lb_consent", value: "denied", url: APP_URL }]);
    await signInContext(reporter, await createUser());
    const member = await reporter.newPage();
    await gotoReady(member, "/app/browse");
    await member.getByRole("tab", { name: /Community/ }).click();
    const card = member.getByRole("article").filter({ hasText: name });
    await card.getByRole("button", { name: "More actions" }).click();
    await member.getByRole("menuitem", { name: "Report collection" }).click();
    await member.getByRole("radio").first().check({ force: true });
    await member.getByRole("button", { name: "Report", exact: true }).click();
    await expect
      .poll(async () => {
        const rows = await sql("select 1 from public.collection_reports where collection_id = $1", [
          collectionId,
        ]);
        return rows.length;
      })
      .toBe(1);

    const admin = await browser.newContext({
      baseURL: APP_URL,
      storageState: "e2e/.auth/admin.json",
    });
    const adminPage = await admin.newPage();
    await gotoReady(adminPage, `/admin/collections/${collectionId}`);
    await adminPage.getByRole("button", { name: "Stop sharing" }).click();
    const dialog = adminPage.getByRole("alertdialog");
    await dialog.getByRole("combobox").selectOption({ index: 1 });
    await dialog.getByRole("textbox").fill("Reported by a member");
    await dialog.getByRole("button", { name: "Stop sharing" }).click();

    await expect
      .poll(async () => {
        const [row] = await sql<{ visibility: string; blocked: boolean }>(
          "select visibility, share_blocked_at is not null as blocked from public.collections where id = $1",
          [collectionId],
        );
        return row;
      })
      .toEqual({ visibility: "private", blocked: true });
    const audit = await sql(
      "select 1 from public.admin_audit_log where target_id = $1 and action = 'stop_sharing_collection'",
      [collectionId],
    );
    expect(audit.length).toBeGreaterThan(0);

    await reporter.close();
    await admin.close();
  });
});
