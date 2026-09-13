"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";

/** Called once when a Review/Quiz session's background write queue goes
 *  idle, instead of after every individual grade/answer. `after()` defers
 *  the revalidation past the response so the caller doesn't wait on it. */
export async function revalidateStudyPathsAction(surface: "review" | "quiz"): Promise<void> {
  after(() => {
    revalidatePath("/jargon");
    if (surface === "review") {
      revalidatePath("/jargon/review");
    }
  });
}
