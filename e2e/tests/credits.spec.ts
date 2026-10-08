import { test, expect } from "../fixtures";
import { creditsLeft, drainCredits } from "../support/credits";
import { gotoReady } from "../support/navigation";
import { seedCollection } from "../support/seed";
import { LLM_FAIL_MARKER, stub } from "../support/stub-client";

async function startAiQuiz(page: import("@playwright/test").Page, domainId: string, count: string) {
  await gotoReady(page, `/app/quiz?domain=${domainId}`);
  await page.getByRole("radio", { name: "AI" }).click({ force: true });
  await page.getByRole("button", { name: count, exact: true }).click();
  await page.getByRole("button", { name: "Start quiz" }).click();
}

test.describe("AI credits", () => {
  test("an AI quiz is written by the model and costs a credit per question", async ({
    page,
    user,
  }) => {
    const { domainId } = await seedCollection(user);
    const before = await creditsLeft(user.id);

    await startAiQuiz(page, domainId, "5");
    await expect(page.getByText("Question 1 of 5")).toBeVisible();

    expect(await creditsLeft(user.id)).toBe(before - 5);
    expect((await stub.requests()).some(({ service }) => service === "llm")).toBe(true);
  });

  test("a quiz the model fails to write gives the credits back", async ({ page, user }) => {
    const { domainId } = await seedCollection(user, [
      { term: `${LLM_FAIL_MARKER} one`, definition: "Makes the model call fail." },
      { term: `${LLM_FAIL_MARKER} two`, definition: "Makes the model call fail." },
      { term: `${LLM_FAIL_MARKER} three`, definition: "Makes the model call fail." },
      { term: `${LLM_FAIL_MARKER} four`, definition: "Makes the model call fail." },
      { term: `${LLM_FAIL_MARKER} five`, definition: "Makes the model call fail." },
    ]);
    const before = await creditsLeft(user.id);

    await startAiQuiz(page, domainId, "5");

    await expect(page.getByRole("alert")).toBeVisible();
    await expect.poll(() => creditsLeft(user.id)).toBe(before);
  });

  test("with no credits left the free top-up refills them", async ({ page, user }) => {
    const { domainId } = await seedCollection(user);
    await drainCredits(user.id);
    expect(await creditsLeft(user.id)).toBe(0);

    await gotoReady(page, `/app/quiz?domain=${domainId}`);
    await page.getByRole("radio", { name: "AI" }).click({ force: true });
    await page.getByRole("button", { name: /free credits/i }).click();

    await expect.poll(() => creditsLeft(user.id)).toBe(30);
    await expect
      .poll(async () => (await stub.outbox()).some((mail) => mail.to.includes(user.email)))
      .toBe(true);
  });
});
