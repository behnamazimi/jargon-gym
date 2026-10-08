import { sql } from "./db";

export async function creditsLeft(userId: string): Promise<number> {
  const [row] = await sql<{ remaining: number }>(
    "select remaining from public.ai_credit_balance($1)",
    [userId],
  );
  return row!.remaining;
}

/** Spends whatever the person has left, so the next AI use hits the empty state. */
export async function drainCredits(userId: string): Promise<void> {
  const left = await creditsLeft(userId);
  if (left > 0)
    await sql("select * from public.reserve_ai_credits($1, 'quiz', $2)", [userId, left]);
}
