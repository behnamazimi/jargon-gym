"use server";

import { applyReviewGrade } from "@/lib/terms/review-outcome";
import { requireAuthenticatedClient } from "@/lib/auth/require-session";
import type { ReviewGrade } from "@/lib/trace";

export async function rateReviewTermAction(termId: string, grade: ReviewGrade) {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) {
    return { error: "Log in to review terms." };
  }

  try {
    await applyReviewGrade(auth.supabase, auth.user.id, {
      termId,
      grade,
      mode: "session",
    });

    return {};
  } catch (err) {
    console.error("rateReviewTermAction failed", { termId, grade, err });
    return { error: "Couldn't save your rating. Try again." };
  }
}
