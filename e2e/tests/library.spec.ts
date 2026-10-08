import { test, expect } from "../fixtures";
import { sql } from "../support/db";
import { gotoReady } from "../support/navigation";
import { SAMPLE_TERMS, seedCollection } from "../support/seed";

const FIRST_TERM = [...SAMPLE_TERMS].map((t) => t.term).sort()[0]!; // Backpressure, as the library lists A to Z

async function markedKnown(userId: string, term: string): Promise<boolean> {
  const rows = await sql(
    `select 1 from public.review_state rs join public.terms t on t.id = rs.term_id
     where rs.user_id = $1 and t.term = $2 and rs.marked_known_at is not null`,
    [userId, term],
  );
  return rows.length > 0;
}

test.describe("Managing the library", () => {
  test(
    "marking a term known can be undone",
    { tag: "@smoke" },
    async ({ page, user, isMobile }) => {
      test.skip(isMobile, "Phones mark known by swiping a row");
      const { domainId } = await seedCollection(user);
      await gotoReady(page, `/app/library?domain=${domainId}`);
      const row = page.getByRole("article").filter({ hasText: FIRST_TERM });

      await row.getByRole("button", { name: "Mark known" }).click();
      await expect(page.getByText(`Marked "${FIRST_TERM}" known`)).toBeVisible();
      await expect.poll(() => markedKnown(user.id, FIRST_TERM)).toBe(true);

      await page.getByRole("button", { name: "Undo" }).click();
      await expect.poll(() => markedKnown(user.id, FIRST_TERM)).toBe(false);
    },
  );

  test("a known term stays known after a reload", async ({ page, user, isMobile }) => {
    test.skip(isMobile, "Phones mark known by swiping a row");
    const { domainId } = await seedCollection(user);
    await gotoReady(page, `/app/library?domain=${domainId}`);
    const row = page.getByRole("article").filter({ hasText: FIRST_TERM });
    await row.getByRole("button", { name: "Mark known" }).click();
    await expect.poll(() => markedKnown(user.id, FIRST_TERM)).toBe(true);

    await page.reload();
    await expect(
      page
        .getByRole("article")
        .filter({ hasText: FIRST_TERM })
        .getByRole("button", { name: "Mark unknown" }),
    ).toBeVisible();
  });

  test(
    "deleting a term removes it from the collection",
    { tag: "@smoke" },
    async ({ page, user }) => {
      const { domainId } = await seedCollection(user);
      await gotoReady(page, `/app/library?domain=${domainId}`);

      await page.getByRole("button", { name: `Actions for ${FIRST_TERM}` }).click();
      await page.getByRole("menuitem", { name: "Delete" }).click();
      await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();

      await expect(page.getByRole("article").filter({ hasText: FIRST_TERM })).toHaveCount(0);
      await expect
        .poll(
          async () =>
            (await sql("select 1 from public.terms where domain_id = $1", [domainId])).length,
        )
        .toBe(SAMPLE_TERMS.length - 1);
    },
  );

  test("deleting a collection removes its terms", { tag: "@smoke" }, async ({ page, user }) => {
    const { domainId, name } = await seedCollection(user);
    await gotoReady(page, `/app/library?domain=${domainId}`);

    await page.getByRole("button", { name: "Collection actions" }).click();
    await page.getByRole("menuitem", { name: "Delete collection" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();

    await expect(page.getByRole("link", { name })).toHaveCount(0);
    await expect
      .poll(
        async () => (await sql("select 1 from public.domains where id = $1", [domainId])).length,
      )
      .toBe(0);
  });
});
