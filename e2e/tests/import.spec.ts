import { test, expect } from "../fixtures";
import { sql } from "../support/db";
import { gotoReady } from "../support/navigation";
import { SAMPLE_TERMS, seedCollection } from "../support/seed";

const LIST = [
  "Idempotent\tSafe to run more than once",
  "Latency\tThe delay before a response",
  "Backpressure\tSlowing producers down",
  "Lonely word\t",
].join("\n");

test.describe("Adding terms", () => {
  test(
    "pasting a list adds the terms to a new collection",
    { tag: "@smoke" },
    async ({ page, user }) => {
      await gotoReady(page, "/app/import/paste");
      await page.getByLabel("Your list").fill(LIST);
      await page.getByRole("button", { name: "Check your list" }).click();

      await page.getByLabel("Name", { exact: true }).fill("Imported from a list");
      await page.getByRole("button", { name: /^Add \d+ terms?/ }).click();
      await expect(page).toHaveURL(/\/app\/library\?collection=/);

      await expect
        .poll(async () => {
          const rows = await sql<{ term: string; definition: string | null }>(
            `select t.term, t.definition from public.terms t
           join public.collections d on d.id = t.collection_id
           where d.owner_id = $1 order by t.term`,
            [user.id],
          );
          return rows.map((row) => row.term);
        })
        .toEqual(["Backpressure", "Idempotent", "Latency", "Lonely word"]);
    },
  );

  test("a term without a definition is kept but left out of study", async ({ page, user }) => {
    await gotoReady(page, "/app/import/paste");
    await page.getByLabel("Your list").fill(LIST);
    await page.getByRole("button", { name: "Check your list" }).click();
    await page.getByLabel("Name", { exact: true }).fill("Imported from a list");
    await page.getByRole("button", { name: /^Add \d+ terms?/ }).click();
    await expect(page).toHaveURL(/\/app\/library\?collection=/);

    const [counts] = await sql<{ finished: string; unfinished: string }>(
      `select count(*) filter (where t.definition is not null and t.definition <> '') as finished,
              count(*) filter (where t.definition is null or t.definition = '') as unfinished
       from public.terms t join public.collections d on d.id = t.collection_id
       where d.owner_id = $1`,
      [user.id],
    );
    expect(Number(counts!.finished)).toBe(3);
    expect(Number(counts!.unfinished)).toBe(1);
  });

  test(
    "saving a term adds it to the chosen collection",
    { tag: "@smoke" },
    async ({ page, user }) => {
      const { collectionId } = await seedCollection(user, SAMPLE_TERMS.slice(0, 2));
      await gotoReady(page, `/app/capture?to=${collectionId}`);

      await page.getByLabel("Term", { exact: true }).fill("Idempotent retry");
      await page.getByLabel("Definition").fill("Repeating the call is safe.");
      await page.getByRole("button", { name: "Save", exact: true }).click();

      await expect(page.getByText("Saved “Idempotent retry”")).toBeVisible();
      const rows = await sql(
        "select 1 from public.terms where collection_id = $1 and term = 'Idempotent retry'",
        [collectionId],
      );
      expect(rows).toHaveLength(1);
    },
  );

  test("creating the first collection while capturing shows the term form", async ({
    page,
    user,
  }) => {
    await gotoReady(page, "/app/capture");
    await page.getByLabel("Name").fill("My first collection");
    await page.getByRole("button", { name: "Create and continue" }).click();

    await expect(page.getByLabel("Term", { exact: true })).toBeVisible();
    const rows = await sql<{ name: string }>(
      "select name from public.domains where owner_id = $1",
      [user.id],
    );
    expect(rows.map((row) => row.name)).toEqual(["My first collection"]);
  });
});
