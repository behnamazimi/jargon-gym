import type { AttentionFlag, CrossTrackFlag, KnownLabel } from "@/lib/trace";

export type PassFailCounts = { passes: number; fails: number };

export type DebugScoredRow = {
  termId: string;
  term: string;
  domainId: string;
  readCount: number;
  lastReadAt: string | null;
  familiarity: number;
  /** Read ranking's decay-aware cross-tier exposure component (see
   *  computeReadExposure) — always computed, not just when context is
   *  "read", matching this file's existing convention of showing every
   *  raw/derived signal regardless of the active tab. */
  readExposure: number;
  /** Read ranking's mastery-tempering component, unweighted (see
   *  computeReadTempering) — multiply by READ_TEMPER_WEIGHT to get its
   *  actual contribution to readRankScore below. */
  readTempering: number;
  /** The exact value rankReadQueue sorts by: readExposure +
   *  READ_TEMPER_WEIGHT * readTempering. Exposed directly so a
   *  misbehaving Read pick can be reverse-engineered without redoing
   *  this arithmetic by hand. */
  readRankScore: number;
  reviewRecallCount: number;
  lastReviewRecallAt: string | null;
  recallStability: number | null;
  recallDifficulty: number | null;
  recallRetrievability: number | null;
  quizTestCount: number;
  lastQuizTestedAt: string | null;
  quizKnowledgePosterior: number | null;
  recognitionRetrievability: number | null;
  mastery: number;
  masteryAdjusted: number;
  knownLabel: KnownLabel;
  /** First moment this term's Mastery_adjusted ever crossed the known
   *  threshold — a permanent high-water mark, unlike knownLabel above,
   *  which decays with the live score. Null if it's never happened. */
  everMasteredAt: string | null;
  /** Full pass/fail history per track, not just the last few — distinct
   *  from attentionFlags below, which only look at a recent slice. */
  recallPassFailCounts: PassFailCounts;
  recognitionPassFailCounts: PassFailCounts;
  /** Recent-actual-vs-predicted mismatches — a term can carry one per
   *  track (recall, recognition) independently. Empty when nothing
   *  diverges enough to be worth a look, or there isn't enough recent
   *  history to trust the comparison yet. */
  attentionFlags: AttentionFlag[];
  /** Set when this term's two live retrievabilities — not a prediction
   *  check like attentionFlags, a comparison between them — disagree
   *  sharply right now. */
  crossTrackFlag: CrossTrackFlag | null;
  /** Days until this term's retrievability in the selected context's track
   *  decays back under the session cooldown threshold — non-null only for
   *  a term currently excluded from the ranked queue because it was just
   *  graded. Null for Read (cooldown doesn't apply), an untested track, or
   *  a term that's already eligible. */
  daysUntilEligible: number | null;
};
