import { STORY_FORMATS, STORY_TONES, type StyleOption } from "./styles";
import type { StoryVote } from "./types";

const VOTE_HALF_LIFE_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

function scoreOptions(
  options: readonly StyleOption[],
  votes: StoryVote[],
  pick: (vote: StoryVote) => string,
  now: Date,
): Map<string, number> {
  const scores = new Map(options.map((option) => [option.id, 0]));
  for (const vote of votes) {
    const id = pick(vote);
    const current = scores.get(id);
    if (current === undefined) continue;
    const ageDays = Math.max(0, (now.getTime() - vote.createdAt.getTime()) / DAY_MS);
    scores.set(id, current + vote.vote * 0.5 ** (ageDays / VOTE_HALF_LIFE_DAYS));
  }
  return scores;
}

/** Weights are exp(score), so a disliked style becomes rarer but is never
 *  ruled out, and with no votes every option is equally likely. */
export function styleWeights(
  options: readonly StyleOption[],
  votes: StoryVote[],
  pick: (vote: StoryVote) => string,
  now: Date,
): { id: string; weight: number }[] {
  const scores = scoreOptions(options, votes, pick, now);
  return options.map((option) => ({ id: option.id, weight: Math.exp(scores.get(option.id)!) }));
}

function drawWeighted(weights: { id: string; weight: number }[], rng: () => number): string {
  const total = weights.reduce((sum, entry) => sum + entry.weight, 0);
  let target = rng() * total;
  for (const entry of weights) {
    target -= entry.weight;
    if (target < 0) return entry.id;
  }
  return weights[weights.length - 1]!.id;
}

export function pickStyle(
  votes: StoryVote[],
  rng: () => number = Math.random,
  now: Date = new Date(),
): { format: string; tone: string } {
  return {
    format: drawWeighted(
      styleWeights(STORY_FORMATS, votes, (vote) => vote.format, now),
      rng,
    ),
    tone: drawWeighted(
      styleWeights(STORY_TONES, votes, (vote) => vote.tone, now),
      rng,
    ),
  };
}
