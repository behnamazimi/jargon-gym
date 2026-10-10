"use server";

import { after } from "next/server";
import { z } from "zod";
import { trackServer } from "@/lib/analytics/server";
import { requireAuthenticatedClient } from "@/lib/auth/require-session";
import { recordRead } from "@/lib/terms/review-outcome";
import { listStorySummaries, markStoryRead, setVote } from "@/lib/stories/repository";
import type { StorySummary } from "@/lib/stories/types";
import { createAdminClient } from "@/lib/supabase/admin";

const LOGIN_ERROR = "Log in to continue.";

export async function markStoryReadAction(
  storyId: string,
): Promise<{ error: string } | { readAt: string | null }> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { error: LOGIN_ERROR };
  if (!z.uuid().safeParse(storyId).success) return { error: "That story isn't available." };

  const userId = auth.user.id;
  try {
    const marked = await markStoryRead(createAdminClient(), userId, storyId);
    if (!marked) return { readAt: null };

    after(async () => {
      const admin = createAdminClient();
      for (const termId of marked.termIds) {
        try {
          await recordRead(admin, userId, termId, "admin");
        } catch (err) {
          console.error("Failed to record story read:", err);
        }
      }
    });
    trackServer(userId, "story_read", { term_count: marked.termIds.length });
    return { readAt: marked.readAt };
  } catch (err) {
    console.error("markStoryReadAction failed:", err);
    return { error: "Couldn't mark this story as read. Try again." };
  }
}

export async function voteStoryAction(
  storyId: string,
  vote: -1 | 1 | null,
): Promise<{ error?: string }> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { error: LOGIN_ERROR };
  if (!z.uuid().safeParse(storyId).success) return { error: "That story isn't available." };
  if (vote !== null && vote !== 1 && vote !== -1) return { error: "Invalid vote." };

  try {
    await setVote(createAdminClient(), auth.user.id, storyId, vote);
    return {};
  } catch (err) {
    console.error("voteStoryAction failed:", err);
    return { error: "Couldn't save your vote." };
  }
}

export async function listStoryHistoryAction(): Promise<
  { stories: StorySummary[] } | { error: string }
> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { error: LOGIN_ERROR };

  try {
    return { stories: await listStorySummaries(createAdminClient(), auth.user.id) };
  } catch (err) {
    console.error("listStoryHistoryAction failed:", err);
    return { error: "Couldn't load your stories. Try again." };
  }
}
