"use server";

import { after } from "next/server";
import { z } from "zod";
import { requireAuthenticatedClient } from "@/lib/auth/require-session";
import { recordRead } from "@/lib/jargon/review-outcome";
import { withRunGuard } from "@/lib/ai/run-guard";
import { runMetered } from "@/lib/ai/run-metered";
import { storyCost } from "@/lib/ai-credits/costs";
import { busyFailure, creditsRefusedFailure, noAiFailure } from "@/lib/ai-credits/messages";
import { resolveAiAccess } from "@/lib/llm/access";
import type { AiFailureReason } from "@/lib/llm/types";
import { storyFailure } from "@/lib/stories/failure";
import { generateStory } from "@/lib/stories/generate";
import {
  dismissUnreadStories,
  getCollection,
  insertStory,
  listStorySummaries,
  markStoryRead,
  setVote,
} from "@/lib/stories/repository";
import { termsForLength } from "@/lib/stories/length";
import { savePrefs } from "@/lib/stories/prefs";
import { loadRecentTitles, loadRecentVotes } from "@/lib/stories/recent";
import { pickSetting } from "@/lib/stories/settings";
import { pickStyle } from "@/lib/stories/style-picker";
import { findFormat, findTone } from "@/lib/stories/styles";
import {
  CEFR_LEVELS,
  PIECE_LENGTHS,
  READING_LEVELS,
  STORY_MIN_TERMS,
  STORY_OUTLINE_MAX,
  type Story,
  type StorySummary,
  type StoryTerm,
} from "@/lib/stories/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { pickReadTermsForUser } from "@/lib/trace-queue";

export type StoryResult =
  | { error: string; reason?: AiFailureReason }
  | { story: Story; terms: StoryTerm[] };

const LOGIN_ERROR = "Log in to continue.";
const NOT_ENOUGH_TERMS_ERROR = `This collection needs at least ${STORY_MIN_TERMS} terms left to read.`;

const generateInputSchema = z.object({
  domainId: z.guid(),
  readingLevel: z.enum(READING_LEVELS),
  cefrLevel: z.enum(CEFR_LEVELS),
  pieceLength: z.enum(PIECE_LENGTHS),
  outline: z
    .string()
    .trim()
    .max(STORY_OUTLINE_MAX)
    .transform((value) => value || null)
    .nullable(),
});

export async function generateStoryAction(input: {
  domainId: string;
  readingLevel: string;
  cefrLevel: string;
  pieceLength: string;
  outline: string | null;
}): Promise<StoryResult> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { error: LOGIN_ERROR };

  const parsed = generateInputSchema.safeParse(input);
  if (!parsed.success) return { error: "Check the story setup and try again." };
  const { domainId, readingLevel, cefrLevel, pieceLength, outline } = parsed.data;
  const levels = { readingLevel, cefrLevel, pieceLength };
  const userId = auth.user.id;
  const admin = createAdminClient();
  let usingCredits = false;

  try {
    const access = await resolveAiAccess(auth.supabase, admin, userId, "story");
    if (access.kind === "unavailable") return noAiFailure(access.reason, "write stories");
    usingCredits = access.kind === "credits";

    await savePrefs(admin, userId, domainId, levels);

    const [cards, collection, votes, recentTitles] = await Promise.all([
      pickReadTermsForUser(admin, userId, { domainIds: [domainId] }, termsForLength(pieceLength)),
      getCollection(admin, domainId),
      loadRecentVotes(admin, userId),
      loadRecentTitles(admin, userId, domainId),
    ]);
    if (!collection || cards.length < STORY_MIN_TERMS) return { error: NOT_ENOUGH_TERMS_ERROR };

    const style = pickStyle(votes);
    const format = findFormat(style.format)!;
    const tone = findTone(style.tone)!;
    const terms = cards.map((card) => ({
      id: card.id,
      term: card.term,
      definition: card.definition,
    }));

    // Everything the user receives, so a failure anywhere in here refunds the credits.
    const produce = async () => {
      const generated = await generateStory({
        provider: access.provider,
        apiKey: access.apiKey,
        terms,
        collectionName: collection.name,
        language: collection.language,
        format,
        tone,
        readingLevel,
        cefrLevel,
        pieceLength,
        outline,
        setting: pickSetting(format.id),
        recentTitles,
      });

      const usedIds = new Set(generated.termIds);
      const story = await insertStory(admin, {
        userId,
        domainId,
        language: collection.language,
        format: format.id,
        tone: tone.id,
        levels,
        outline,
        title: generated.title,
        segments: generated.segments,
        termIds: generated.termIds,
        newTermIds: cards
          .filter((card) => card.isNewToUser && usedIds.has(card.id))
          .map((card) => card.id),
      });
      return { story, usedIds };
    };

    let produced: Awaited<ReturnType<typeof produce>>;
    if (access.kind === "credits") {
      const outcome = await runMetered(
        {
          admin,
          userId,
          feature: "story",
          cost: storyCost(cards.length, access.costs),
        },
        produce,
      );
      if (!outcome.charged) {
        return outcome.reason === "busy" ? busyFailure() : creditsRefusedFailure(outcome, "story");
      }
      produced = outcome.value;
    } else {
      const guarded = await withRunGuard({ admin, userId, feature: "story" }, produce);
      if (guarded.busy) return busyFailure();
      produced = guarded.value;
    }

    // The story already exists, so tidying older ones must not fail the request.
    await dismissUnreadStories(admin, userId, { keepStoryId: produced.story.id }).catch(
      (err: unknown) => console.error("Failed to dismiss older stories:", err),
    );

    return {
      story: produced.story,
      terms: terms.filter((term) => produced.usedIds.has(term.id)),
    };
  } catch (err) {
    return storyFailure(err, usingCredits);
  }
}

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
