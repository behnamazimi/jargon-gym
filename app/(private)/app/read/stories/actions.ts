"use server";

import { after } from "next/server";
import { z } from "zod";
import { trackServer } from "@/lib/analytics/server";
import { requireAuthenticatedClient } from "@/lib/auth/require-session";
import { createAiTurn } from "@/lib/ai/observability";
import { hasAnalyticsConsent } from "@/lib/consent/server";
import { runAiTurn } from "@/lib/ai/observability-server";
import { recordRead } from "@/lib/terms/review-outcome";
import { runMetered } from "@/lib/ai/run-metered";
import { busyFailure, creditsRefusedFailure, noAiFailure } from "@/lib/ai-credits/messages";
import { recordModelCost } from "@/lib/ai-credits/record-model-cost";
import { createUsageTally } from "@/lib/ai-credits/usage-tally";
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
  collectionId: z.guid(),
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
  collectionId: string;
  readingLevel: string;
  cefrLevel: string;
  pieceLength: string;
  outline: string | null;
}): Promise<StoryResult> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { error: LOGIN_ERROR };

  const parsed = generateInputSchema.safeParse(input);
  if (!parsed.success) return { error: "Check the story setup and try again." };
  const { collectionId, readingLevel, cefrLevel, pieceLength, outline } = parsed.data;
  const levels = { readingLevel, cefrLevel, pieceLength };
  const userId = auth.user.id;
  const admin = createAdminClient();

  try {
    const access = await resolveAiAccess(auth.supabase, admin, userId, "story");
    if (access.kind === "unavailable") {
      trackServer(userId, "ai_generation_blocked", { feature: "story", reason: access.reason });
      return noAiFailure(access.reason, "write stories");
    }

    await savePrefs(admin, userId, collectionId, levels);

    const [cards, collection, votes, recentTitles] = await Promise.all([
      pickReadTermsForUser(
        admin,
        userId,
        { collectionIds: [collectionId] },
        termsForLength(pieceLength),
      ),
      getCollection(admin, collectionId),
      loadRecentVotes(admin, userId),
      loadRecentTitles(admin, userId, collectionId),
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

    const observability = createAiTurn(userId, "story_generation", await hasAnalyticsConsent());
    // Everything the user receives, so a failure anywhere in here refunds the credits.
    const tally = createUsageTally();
    const produce = async ({ ledgerId }: { ledgerId: number }) => {
      const generated = await runAiTurn(observability, () =>
        generateStory({
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
          observability,
          onUsage: tally.add,
        }),
      );
      await recordModelCost(admin, ledgerId, access.provider, tally);

      const usedIds = new Set(generated.termIds);
      const story = await insertStory(admin, {
        userId,
        collectionId,
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

    const outcome = await runMetered(
      {
        admin,
        userId,
        feature: "story",
        units: cards.length,
      },
      produce,
    );
    if (!outcome.charged) {
      if (outcome.reason !== "busy") {
        trackServer(userId, "ai_generation_blocked", { feature: "story", reason: "credits" });
      }
      return outcome.reason === "busy" ? busyFailure() : creditsRefusedFailure(outcome, "story");
    }
    const produced = outcome.value;

    // The story already exists, so tidying older ones must not fail the request.
    await dismissUnreadStories(admin, userId, { keepStoryId: produced.story.id }).catch(
      (err: unknown) => console.error("Failed to dismiss older stories:", err),
    );

    trackServer(userId, "story_generated", {
      format: format.id,
      tone: tone.id,
      reading_level: readingLevel,
      cefr_level: cefrLevel,
      piece_length: pieceLength,
      language: collection.language,
      has_outline: outline !== null,
      term_count: produced.usedIds.size,
      billing: "credits",
    });

    return {
      story: produced.story,
      terms: terms.filter((term) => produced.usedIds.has(term.id)),
    };
  } catch (err) {
    trackServer(userId, "ai_generation_failed", { feature: "story", using_credits: true });
    return storyFailure(err);
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
