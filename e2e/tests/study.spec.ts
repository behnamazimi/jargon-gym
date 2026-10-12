import { test, expect } from "../fixtures";
import { sql } from "../support/db";
import { gotoReady } from "../support/navigation";
import { seedCollection } from "../support/seed";

async function reviewState(userId: string) {
  const [row] = await sql<{
    marked_known: string;
    read: string;
    reviewed: string;
    quizzed: string;
  }>(
    `select count(*) filter (where marked_known_at is not null) as marked_known,
            count(*) filter (where read_count > 0) as read,
            count(*) filter (where review_recall_count > 0) as reviewed,
            count(*) filter (where quiz_test_count > 0) as quizzed
     from public.review_state where user_id = $1`,
    [userId],
  );
  return {
    markedKnown: Number(row!.marked_known),
    read: Number(row!.read),
    reviewed: Number(row!.reviewed),
    quizzed: Number(row!.quizzed),
  };
}

test.describe("Studying a collection", () => {
  test("triage sorts terms into known and not yet", { tag: "@smoke" }, async ({ page, user }) => {
    const { collectionId } = await seedCollection(user);
    await gotoReady(page, `/app/triage?collection=${collectionId}`);
    await expect(page.getByText("10 left to sort")).toBeVisible();

    await page.getByRole("button", { name: "I know this" }).click();
    await expect(page.getByText("9 left to sort")).toBeVisible();
    await page.getByRole("button", { name: "Not yet" }).click();
    await expect(page.getByText("8 left to sort")).toBeVisible();

    await expect.poll(() => reviewState(user.id)).toMatchObject({ markedKnown: 1 });
    await expect
      .poll(async () => {
        const [notYet] = await sql<{ count: string }>(
          "select count(*) from public.triage_deferrals where user_id = $1",
          [user.id],
        );
        return Number(notYet!.count);
      })
      .toBe(1);
  });

  test("reading a card counts as exposure", { tag: "@smoke" }, async ({ page, user }) => {
    const { collectionId } = await seedCollection(user);
    await gotoReady(page, `/app/read?collection=${collectionId}`);

    await page.getByRole("button", { name: "Show definition" }).click();
    await page.getByRole("button", { name: "Next term" }).click();

    await expect.poll(() => reviewState(user.id)).toMatchObject({ read: 1 });
  });

  test("reviewing a term records the grade", { tag: "@smoke" }, async ({ page, user }) => {
    const { collectionId } = await seedCollection(user);
    await gotoReady(page, `/app/review?collection=${collectionId}`);

    await page.getByRole("button", { name: /^Recall the meaning/ }).click();
    await page.getByRole("button", { name: "Good" }).click();

    await expect.poll(() => reviewState(user.id)).toMatchObject({ reviewed: 1 });
    const [event] = await sql<{ grade: number }>(
      "select grade from public.review_events where user_id = $1 and grade is not null",
      [user.id],
    );
    expect(event?.grade).toBe(3);
  });

  test(
    "a missed term is asked again in the same session, and the retry is not a new test",
    { tag: "@smoke" },
    async ({ page, user }) => {
      const { collectionId } = await seedCollection(user);
      await gotoReady(page, `/app/review?collection=${collectionId}`);

      await page.getByRole("button", { name: /^Recall the meaning/ }).click();
      await page.getByRole("button", { name: "Again" }).click();

      // The missed term comes back after a few other cards.
      for (let card = 0; card < 7; card++) {
        await page.getByRole("button", { name: /^Recall the meaning/ }).click();
        await page.getByRole("button", { name: "Good" }).click();
      }

      await expect
        .poll(async () => {
          const rows = await sql<{ retries: string; tests: string }>(
            `select count(*) filter (where e.is_retry) as retries,
                    max(s.review_recall_count) as tests
             from public.review_events e
             join public.review_state s on s.user_id = e.user_id and s.term_id = e.term_id
             where e.user_id = $1 and e.grade is not null
             group by e.term_id
             having count(*) filter (where e.is_retry) > 0`,
            [user.id],
          );
          return rows.map((row) => ({ retries: Number(row.retries), tests: Number(row.tests) }));
        })
        .toEqual([{ retries: 1, tests: 1 }]);
    },
  );

  test(
    "a simple quiz can be finished and shows up in mastery",
    { tag: "@smoke" },
    async ({ page, user }) => {
      const { collectionId } = await seedCollection(user);
      await gotoReady(page, `/app/quiz?collection=${collectionId}`);
      await page.getByRole("button", { name: "5", exact: true }).click();
      await page.getByRole("button", { name: "Start quiz" }).click();

      for (let question = 1; question <= 5; question++) {
        await expect(page.getByText(`Question ${question} of 5`)).toBeVisible();
        await page
          .getByRole("radiogroup", { name: "Answer choices" })
          .locator("label")
          .first()
          .click();
        await page.getByRole("button", { name: "Check answer" }).click();
        const last = question === 5;
        await page.getByRole("button", { name: last ? "See results" : "Next question" }).click();
      }

      await expect(
        page.getByRole("heading", { name: /Quiz complete|Practice complete/ }),
      ).toBeVisible();
      await expect.poll(() => reviewState(user.id)).toMatchObject({ quizzed: 5 });

      await gotoReady(page, "/app/mastery");
      await expect(page.getByRole("group", { name: "Practice activity" })).toContainText(
        "5 quizzed today",
      );
    },
  );
});
