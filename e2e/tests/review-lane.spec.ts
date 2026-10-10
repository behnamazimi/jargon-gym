import { test, expect } from "../fixtures";
import { sql } from "../support/db";
import { gotoReady } from "../support/navigation";
import { seedCollection } from "../support/seed";

/** Grades "Quorum" a day ago with a stability that leaves its recall near 0.79:
 *  below the Again line (0.81) but above the line for everything else (0.7). */
async function gradeQuorumADayAgo(userId: string, collectionId: string, grade: number) {
  await sql(
    `insert into public.review_state
       (user_id, term_id, recall_stability, recall_difficulty,
        review_recall_count, last_review_recall_at, last_review_grade)
     select $1, id, 0.41, 7, 1, now() - interval '1 day', $3
     from public.terms where collection_id = $2 and term = 'Quorum'`,
    [userId, collectionId, grade],
  );
}

const firstCard = (page: import("@playwright/test").Page) =>
  page.getByRole("button", { name: /^Recall the meaning/ });

test.describe("Review order after a missed term", () => {
  test(
    "a term graded Again comes back before new terms",
    { tag: "@smoke" },
    async ({ page, user }) => {
      const { collectionId } = await seedCollection(user);
      await gradeQuorumADayAgo(user.id, collectionId, 1);
      await gotoReady(page, `/app/review?collection=${collectionId}`);

      await expect(firstCard(page)).toHaveAccessibleName(/for Quorum$/);
    },
  );

  test("a term graded Hard comes back before new terms", async ({ page, user }) => {
    const { collectionId } = await seedCollection(user);
    // Recall near 0.75: below the Hard line (0.78)
    await sql(
      `insert into public.review_state
         (user_id, term_id, recall_stability, recall_difficulty,
          review_recall_count, last_review_recall_at, last_review_grade)
       select $1, id, 1.18, 7, 1, now() - interval '3.5 days', 2
       from public.terms where collection_id = $2 and term = 'Quorum'`,
      [user.id, collectionId],
    );
    await gotoReady(page, `/app/review?collection=${collectionId}`);

    await expect(firstCard(page)).toHaveAccessibleName(/for Quorum$/);
  });

  test("a term graded Good waits behind new terms", async ({ page, user }) => {
    const { collectionId } = await seedCollection(user);
    await gradeQuorumADayAgo(user.id, collectionId, 3);
    await gotoReady(page, `/app/review?collection=${collectionId}`);

    await expect(firstCard(page)).toHaveAccessibleName(/for (?!Quorum$)/);
  });
});
