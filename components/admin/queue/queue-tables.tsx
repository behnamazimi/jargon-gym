import type {
  CooldownRow,
  ExcludedReason,
  ExcludedRow,
  QueueDebug,
  QueueSection,
  ReadRow,
  TierRow,
} from "@/lib/admin/queue-debug/build";
import { latest, number, QueueList, When, type Column } from "./queue-list";

const REASON_LABELS: Record<ExcludedReason, string> = {
  unfinished: "No definition yet",
  collection_off: "Collection is off",
  marked_known: "Marked known",
};

export function ReadTable({ section, asOf }: { section: QueueSection<ReadRow>; asOf: Date }) {
  const columns: Column<ReadRow>[] = [
    { label: "Score", cell: (r) => number(r.score) },
    { label: "Exposure", cell: (r) => number(r.exposure) },
    { label: "Mastery nudge", cell: (r) => number(r.temper) },
    { label: "Reads", cell: (r) => r.item.readCount },
    { label: "Reviews", cell: (r) => r.item.reviewRecallCount },
    { label: "Quizzes", cell: (r) => r.item.quizTestCount },
    {
      label: "Last touched",
      nowrap: true,
      cell: (r) => (
        <When
          date={latest([r.item.lastReadAt, r.item.lastReviewRecallAt, r.item.lastQuizTestedAt])}
          asOf={asOf}
        />
      ),
    },
    { label: "Added", nowrap: true, cell: (r) => <When date={r.item.createdAt} asOf={asOf} /> },
  ];
  return (
    <QueueList
      rows={section.rows}
      section={section}
      head={(r) => ({ key: r.item.termId, item: r.item, rank: r.rank, nextBatch: r.nextBatch })}
      columns={columns}
      empty="Nothing for Read to show."
    />
  );
}

export function ReviewTable({ section, asOf }: { section: QueueSection<TierRow>; asOf: Date }) {
  const columns: Column<TierRow>[] = [
    {
      label: "Recall now",
      cell: (r) =>
        r.retrievability === null ? (
          <span className="badge badge-ghost">never graded</span>
        ) : (
          <span className="inline-flex items-center gap-2">
            {number(r.retrievability)}
            {r.lane && <span className="badge badge-warning badge-sm">{r.lane} lane</span>}
          </span>
        ),
    },
    { label: "Sort key", cell: (r) => number(r.sortKey) },
    { label: "Stability", cell: (r) => number(r.item.recallStability, 2) },
    { label: "Difficulty", cell: (r) => number(r.item.recallDifficulty, 2) },
    { label: "Grades", cell: (r) => r.item.reviewRecallCount },
    {
      label: "Last graded",
      nowrap: true,
      cell: (r) => <When date={r.item.lastReviewRecallAt} asOf={asOf} />,
    },
  ];
  return (
    <QueueList
      rows={section.rows}
      section={section}
      head={(r) => ({ key: r.item.termId, item: r.item, rank: r.rank, nextBatch: r.nextBatch })}
      columns={columns}
      empty="Nothing for Review to show."
    />
  );
}

export function QuizTable({ section, asOf }: { section: QueueSection<TierRow>; asOf: Date }) {
  const columns: Column<TierRow>[] = [
    {
      label: "Recognition now",
      cell: (r) =>
        r.retrievability === null ? (
          <span className="badge badge-ghost">never answered</span>
        ) : (
          number(r.retrievability)
        ),
    },
    { label: "Posterior", cell: (r) => number(r.item.quizKnowledgePosterior) },
    { label: "Answers", cell: (r) => r.item.quizTestCount },
    {
      label: "Last answered",
      nowrap: true,
      cell: (r) => <When date={r.item.lastQuizTestedAt} asOf={asOf} />,
    },
  ];
  return (
    <QueueList
      rows={section.rows}
      section={section}
      head={(r) => ({ key: r.item.termId, item: r.item, rank: r.rank, nextBatch: r.nextBatch })}
      columns={columns}
      empty="Nothing for Quiz to show."
    />
  );
}

function CooldownList({
  section,
  asOf,
  track,
}: {
  section: QueueSection<CooldownRow>;
  asOf: Date;
  track: "review" | "quiz";
}) {
  const review = track === "review";
  const columns: Column<CooldownRow>[] = [
    { label: review ? "Recall now" : "Recognition now", cell: (r) => number(r.retrievability) },
    { label: "Stability", cell: (r) => number(r.stability, 2) },
    {
      label: review ? "Difficulty" : "Posterior",
      cell: (r) => number(review ? r.difficulty : r.posterior, review ? 2 : 3),
    },
    {
      label: review ? "Last graded" : "Last answered",
      nowrap: true,
      cell: (r) => <When date={r.lastAt} asOf={asOf} />,
    },
    {
      label: "Back in the queue",
      nowrap: true,
      cell: (r) =>
        r.returnsAt ? (
          <When date={r.returnsAt} asOf={asOf} />
        ) : (
          <span className="text-base-content/50">no last time</span>
        ),
    },
  ];
  return (
    <QueueList
      rows={section.rows}
      section={section}
      head={(r) => ({ key: r.item.termId, item: r.item })}
      columns={columns}
      empty={`No term is waiting out a ${review ? "Review" : "Quiz"} cooldown.`}
    />
  );
}

export function CooldownTables({ debug }: { debug: QueueDebug }) {
  return (
    <div className="flex flex-col gap-6">
      <p className="m-0 text-sm text-base-content/65">
        A term sits out of Review or Quiz while its retrievability is above 0.98. It comes back when
        it decays to 0.98. Read has no cooldown.
      </p>
      <section className="flex flex-col gap-2">
        <h2 className="m-0 text-lg font-semibold text-base-content">Review</h2>
        <CooldownList section={debug.reviewCooldown} asOf={debug.asOf} track="review" />
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="m-0 text-lg font-semibold text-base-content">Quiz</h2>
        <CooldownList section={debug.quizCooldown} asOf={debug.asOf} track="quiz" />
      </section>
    </div>
  );
}

export function ExcludedTable({ section }: { section: QueueSection<ExcludedRow> }) {
  const columns: Column<ExcludedRow>[] = [
    {
      label: "Why it is left out",
      cell: (r) => (
        <span className="flex flex-wrap gap-1">
          {r.reasons.map((reason) => (
            <span key={reason} className="badge badge-ghost">
              {REASON_LABELS[reason]}
            </span>
          ))}
        </span>
      ),
    },
  ];
  return (
    <QueueList
      rows={section.rows}
      section={section}
      head={(r) => ({ key: r.item.termId, item: r.item })}
      columns={columns}
      empty="No term is left out."
    />
  );
}
