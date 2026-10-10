import {
  AGAIN,
  HARD,
  SESSION_COOLDOWN_RETRIEVABILITY,
  UNTESTED_RETRIEVABILITY,
  computeReadExposure,
  computeReadTempering,
  cooldownEndsAt,
  posteriorToStability,
  rankQuizQueue,
  rankReadQueue,
  rankReviewQueue,
  READ_TEMPER_WEIGHT,
  recallRetrievabilityNow,
  recognitionRetrievabilityNow,
  reviewSortKey,
  type TraceCandidate,
} from "@/lib/trace";

export type QueueDebugTerm = TraceCandidate & {
  term: string;
  collectionName: string;
  /** The term's collection is turned on for study. */
  active: boolean;
  /** The term has a definition. */
  finished: boolean;
};

export type ExcludedReason = "unfinished" | "collection_off" | "marked_known";

export type QueueSection<Row> = { rows: Row[]; total: number };

export type ReadRow = {
  rank: number;
  nextBatch: boolean;
  item: QueueDebugTerm;
  exposure: number;
  temper: number;
  score: number;
};

export type TierRow = {
  rank: number;
  nextBatch: boolean;
  item: QueueDebugTerm;
  /** Null when the term has never been graded (Review) or answered (Quiz). */
  retrievability: number | null;
  /** What the tier sorts by, lowest first. Differs from retrievability for a lane term. */
  sortKey: number;
  /** Review only: the term was last graded Again or Hard and its recall is below that line, so it sorts ahead of new terms. */
  lane: "again" | "hard" | null;
};

export type CooldownRow = {
  item: QueueDebugTerm;
  retrievability: number;
  stability: number;
  /** Review only. */
  difficulty: number | null;
  /** Quiz only. */
  posterior: number | null;
  lastAt: Date | null;
  /** Null when there is no last time to count from. */
  returnsAt: Date | null;
};

export type ExcludedRow = { item: QueueDebugTerm; reasons: ExcludedReason[] };

export type QueueDebug = {
  asOf: Date;
  /** Terms the queues can serve at all. */
  eligible: number;
  read: QueueSection<ReadRow>;
  review: QueueSection<TierRow>;
  quiz: QueueSection<TierRow>;
  reviewCooldown: QueueSection<CooldownRow>;
  quizCooldown: QueueSection<CooldownRow>;
  excluded: QueueSection<ExcludedRow>;
};

export type QueueDebugOptions = {
  now: Date;
  /** Only this collection's terms, or all of them. */
  collectionId: string | null;
  /** Rows kept per section. */
  limit: number;
  /** How many top rows each feed takes at once. */
  batch: { read: number; review: number; quiz: number };
};

export function excludedReasons(item: QueueDebugTerm): ExcludedReason[] {
  const reasons: ExcludedReason[] = [];
  if (!item.finished) reasons.push("unfinished");
  if (!item.active) reasons.push("collection_off");
  if (item.markedKnownAt) reasons.push("marked_known");
  return reasons;
}

function section<Row>(all: Row[], limit: number): QueueSection<Row> {
  return { rows: all.slice(0, limit), total: all.length };
}

function byReturn(a: CooldownRow, b: CooldownRow): number {
  if (a.returnsAt === null || b.returnsAt === null) {
    return Number(a.returnsAt === null) - Number(b.returnsAt === null);
  }
  return a.returnsAt.getTime() - b.returnsAt.getTime();
}

function laneOf(c: TraceCandidate, now: Date): TierRow["lane"] {
  if (reviewSortKey(c, now) >= UNTESTED_RETRIEVABILITY) return null;
  return c.lastReviewGrade === AGAIN ? "again" : c.lastReviewGrade === HARD ? "hard" : null;
}

function cooldownRows(
  eligible: QueueDebugTerm[],
  track: "review" | "quiz",
  now: Date,
): CooldownRow[] {
  const rows: CooldownRow[] = [];
  for (const item of eligible) {
    const review = track === "review";
    const retrievability = review
      ? recallRetrievabilityNow(item, now)
      : recognitionRetrievabilityNow(item, now);
    if (retrievability === null || !(retrievability > SESSION_COOLDOWN_RETRIEVABILITY)) continue;

    const stability = review
      ? item.recallStability
      : item.quizKnowledgePosterior !== null
        ? posteriorToStability(item.quizKnowledgePosterior)
        : null;
    if (stability === null) continue;

    const lastAt = review ? item.lastReviewRecallAt : item.lastQuizTestedAt;
    rows.push({
      item,
      retrievability,
      stability,
      difficulty: review ? item.recallDifficulty : null,
      posterior: review ? null : item.quizKnowledgePosterior,
      lastAt,
      returnsAt: lastAt ? cooldownEndsAt(stability, lastAt) : null,
    });
  }
  return rows.sort(byReturn);
}

/** Ranks one member's terms the way Read, Review and Quiz do, and lists the
 *  terms they hold back and the terms they skip. */
export function buildQueueDebug(terms: QueueDebugTerm[], options: QueueDebugOptions): QueueDebug {
  const { now, collectionId, limit, batch } = options;
  const scoped = collectionId ? terms.filter((t) => t.collectionId === collectionId) : terms;
  const byId = new Map(scoped.map((t) => [t.termId, t]));
  const eligible = scoped.filter((t) => excludedReasons(t).length === 0);

  const readRanked = rankReadQueue(eligible, now);
  const read: QueueSection<ReadRow> = {
    total: readRanked.length,
    rows: readRanked.slice(0, limit).map((c, i): ReadRow => {
      const exposure = computeReadExposure(c, now);
      const temper = computeReadTempering(c, now);
      return {
        rank: i + 1,
        nextBatch: i < batch.read,
        item: byId.get(c.termId)!,
        exposure,
        temper,
        score: exposure + READ_TEMPER_WEIGHT * temper,
      };
    }),
  };

  const tier = (
    ranked: TraceCandidate[],
    size: number,
    track: "review" | "quiz",
  ): QueueSection<TierRow> => ({
    total: ranked.length,
    rows: ranked.slice(0, limit).map((c, i): TierRow => ({
      rank: i + 1,
      nextBatch: i < size,
      item: byId.get(c.termId)!,
      retrievability:
        track === "review" ? recallRetrievabilityNow(c, now) : recognitionRetrievabilityNow(c, now),
      sortKey:
        track === "review"
          ? reviewSortKey(c, now)
          : (recognitionRetrievabilityNow(c, now) ?? UNTESTED_RETRIEVABILITY),
      lane: track === "review" ? laneOf(c, now) : null,
    })),
  });

  const excluded = scoped
    .map((item): ExcludedRow => ({ item, reasons: excludedReasons(item) }))
    .filter((row) => row.reasons.length > 0)
    .sort((a, b) => a.item.term.localeCompare(b.item.term));

  return {
    asOf: now,
    eligible: eligible.length,
    read,
    review: tier(rankReviewQueue(eligible, now), batch.review, "review"),
    quiz: tier(rankQuizQueue(eligible, now), batch.quiz, "quiz"),
    reviewCooldown: section(cooldownRows(eligible, "review", now), limit),
    quizCooldown: section(cooldownRows(eligible, "quiz", now), limit),
    excluded: section(excluded, limit),
  };
}
