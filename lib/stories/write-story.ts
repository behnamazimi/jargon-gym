import { after } from "next/server";
import { z } from "zod";
import { trackServer } from "@/lib/analytics/server";
import { createAiTurn } from "@/lib/ai/observability";
import { runAiTurn } from "@/lib/ai/observability-server";
import { runMetered } from "@/lib/ai/run-metered";
import { busyFailure, creditsRefusedFailure, noAiFailure } from "@/lib/ai-credits/messages";
import { recordModelCost } from "@/lib/ai-credits/record-model-cost";
import { createUsageTally } from "@/lib/ai-credits/usage-tally";
import { hasAnalyticsConsent } from "@/lib/consent/server";
import { resolveAiAccess } from "@/lib/llm/access";
import type { AiFailureReason } from "@/lib/llm/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { pickReadTermsForUser } from "@/lib/trace-queue";
import { storyFailure } from "./failure";
import { generateStory, StoryProviderError, type StoryRetryReason } from "./generate";
import { termsForLength } from "./length";
import { savePrefs } from "./prefs";
import { loadRecentTitles, loadRecentVotes } from "./recent";
import { dismissUnreadStories, getCollection, insertStory } from "./repository";
import { pickSetting } from "./settings";
import { pickStyle } from "./style-picker";
import { findFormat, findTone } from "./styles";
import {
  CEFR_LEVELS,
  PIECE_LENGTHS,
  STORY_MIN_TERMS,
  STORY_OUTLINE_MAX,
  type Story,
  type StoryTerm,
} from "./types";

type StoryResult =
  | { error: string; reason?: AiFailureReason }
  | { story: Story; terms: StoryTerm[] };

type Auth = {
  supabase: Parameters<typeof resolveAiAccess>[0];
  user: { id: string };
};

type StoryProgress = {
  onText: (delta: string) => void;
  onRetry: () => void;
};

const NOT_ENOUGH_TERMS_ERROR = `This collection needs at least ${STORY_MIN_TERMS} terms left to read.`;

const generateInputSchema = z.object({
  collectionId: z.guid(),
  cefrLevel: z.enum(CEFR_LEVELS),
  pieceLength: z.enum(PIECE_LENGTHS),
  outline: z
    .string()
    .trim()
    .max(STORY_OUTLINE_MAX)
    .transform((value) => value || null)
    .nullable(),
});

/** Writes and saves one story for the user, charging credits and refunding
 *  them on any failure. `progress` hears the reply as it is written. */
export async function writeStory(
  auth: Auth,
  rawInput: unknown,
  progress: StoryProgress,
): Promise<StoryResult> {
  const parsed = generateInputSchema.safeParse(rawInput);
  if (!parsed.success) return { error: "Check the story setup and try again." };
  const { collectionId, cefrLevel, pieceLength, outline } = parsed.data;
  const levels = { cefrLevel, pieceLength };
  const userId = auth.user.id;
  const admin = createAdminClient();

  try {
    const access = await resolveAiAccess(auth.supabase, admin, userId, "story");
    if (access.kind === "unavailable") {
      trackServer(userId, "ai_generation_blocked", { feature: "story", reason: access.reason });
      return noAiFailure(access.reason, "write stories");
    }

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
      savePrefs(admin, userId, collectionId, levels),
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
          cefrLevel,
          pieceLength,
          outline,
          setting: pickSetting(format.id),
          recentTitles,
          observability,
          onUsage: tally.add,
          onText: progress.onText,
          onRetry: (reason: StoryRetryReason) => {
            trackServer(userId, "story_retry", { reason });
            progress.onRetry();
          },
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

    // The story already exists, so tidying older ones must not hold up or fail the request.
    after(() =>
      dismissUnreadStories(admin, userId, { keepStoryId: produced.story.id }).catch(
        (err: unknown) => console.error("Failed to dismiss older stories:", err),
      ),
    );

    trackServer(userId, "story_generated", {
      format: format.id,
      tone: tone.id,
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
    trackServer(userId, "ai_generation_failed", {
      feature: "story",
      using_credits: true,
      kind: err instanceof StoryProviderError ? err.kind : "other",
    });
    return storyFailure(err);
  }
}
