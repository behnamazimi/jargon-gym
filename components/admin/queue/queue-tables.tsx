import type { ReactNode } from "react";
import type {
  CooldownRow,
  ExcludedReason,
  ExcludedRow,
  QueueDebug,
  QueueDebugTerm,
  QueueSection,
  ReadRow,
  TierRow,
} from "@/lib/admin/queue-debug/build";
import { LocalTime } from "./local-time";

const REASON_LABELS: Record<ExcludedReason, string> = {
  unfinished: "No definition yet",
  collection_off: "Collection is off",
  marked_known: "Marked known",
};

const number = (value: number | null, digits = 3) => (value === null ? "—" : value.toFixed(digits));

function TermCell({ item }: { item: QueueDebugTerm }) {
  return (
    <td>
      <p className="m-0 font-medium text-base-content">{item.term}</p>
      <p className="m-0 text-xs text-base-content/55">{item.domainName}</p>
    </td>
  );
}

function RankCell({ rank, nextBatch }: { rank: number; nextBatch: boolean }) {
  return (
    <td className="whitespace-nowrap">
      {rank}
      {nextBatch ? <span className="badge badge-primary badge-sm ml-2">next</span> : null}
    </td>
  );
}

function When({ date, asOf }: { date: Date | null; asOf: Date }) {
  if (!date) return <span className="text-base-content/50">never</span>;
  return <LocalTime iso={date.toISOString()} asOfIso={asOf.toISOString()} />;
}

function Table({
  head,
  section,
  empty,
  children,
}: {
  head: string[];
  section: QueueSection<unknown>;
  empty: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto rounded-lg border border-base-300">
        <table className="table table-sm">
          <thead>
            <tr>
              {head.map((label) => (
                <th key={label}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {children}
            {section.rows.length === 0 ? (
              <tr>
                <td colSpan={head.length} className="text-center text-base-content/50">
                  {empty}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <p className="m-0 text-sm text-base-content/65">
        Showing {section.rows.length} of {section.total}.
      </p>
    </div>
  );
}

export function ReadTable({ section, asOf }: { section: QueueSection<ReadRow>; asOf: Date }) {
  return (
    <Table
      head={[
        "#",
        "Term",
        "Score",
        "Exposure",
        "Mastery nudge",
        "Reads",
        "Reviews",
        "Quizzes",
        "Last touched",
        "Added",
      ]}
      section={section}
      empty="Nothing for Read to show."
    >
      {section.rows.map(({ item, rank, nextBatch, score, exposure, temper }) => (
        <tr key={item.termId}>
          <RankCell rank={rank} nextBatch={nextBatch} />
          <TermCell item={item} />
          <td>{number(score)}</td>
          <td>{number(exposure)}</td>
          <td>{number(temper)}</td>
          <td>{item.readCount}</td>
          <td>{item.reviewRecallCount}</td>
          <td>{item.quizTestCount}</td>
          <td>
            <When
              date={latest([item.lastReadAt, item.lastReviewRecallAt, item.lastQuizTestedAt])}
              asOf={asOf}
            />
          </td>
          <td>
            <When date={item.createdAt} asOf={asOf} />
          </td>
        </tr>
      ))}
    </Table>
  );
}

function latest(dates: (Date | null)[]): Date | null {
  const present = dates.filter((d): d is Date => d !== null);
  return present.length === 0 ? null : new Date(Math.max(...present.map((d) => d.getTime())));
}

export function ReviewTable({ section, asOf }: { section: QueueSection<TierRow>; asOf: Date }) {
  return (
    <Table
      head={["#", "Term", "Recall now", "Stability", "Difficulty", "Grades", "Last graded"]}
      section={section}
      empty="Nothing for Review to show."
    >
      {section.rows.map(({ item, rank, nextBatch, retrievability }) => (
        <tr key={item.termId}>
          <RankCell rank={rank} nextBatch={nextBatch} />
          <TermCell item={item} />
          <td>
            {retrievability === null ? (
              <span className="badge badge-ghost">never graded</span>
            ) : (
              number(retrievability)
            )}
          </td>
          <td>{number(item.recallStability, 2)}</td>
          <td>{number(item.recallDifficulty, 2)}</td>
          <td>{item.reviewRecallCount}</td>
          <td>
            <When date={item.lastReviewRecallAt} asOf={asOf} />
          </td>
        </tr>
      ))}
    </Table>
  );
}

export function QuizTable({ section, asOf }: { section: QueueSection<TierRow>; asOf: Date }) {
  return (
    <Table
      head={["#", "Term", "Recognition now", "Posterior", "Answers", "Last answered"]}
      section={section}
      empty="Nothing for Quiz to show."
    >
      {section.rows.map(({ item, rank, nextBatch, retrievability }) => (
        <tr key={item.termId}>
          <RankCell rank={rank} nextBatch={nextBatch} />
          <TermCell item={item} />
          <td>
            {retrievability === null ? (
              <span className="badge badge-ghost">never answered</span>
            ) : (
              number(retrievability)
            )}
          </td>
          <td>{number(item.quizKnowledgePosterior)}</td>
          <td>{item.quizTestCount}</td>
          <td>
            <When date={item.lastQuizTestedAt} asOf={asOf} />
          </td>
        </tr>
      ))}
    </Table>
  );
}

function CooldownTable({
  section,
  asOf,
  track,
}: {
  section: QueueSection<CooldownRow>;
  asOf: Date;
  track: "review" | "quiz";
}) {
  const review = track === "review";
  return (
    <Table
      head={[
        "Term",
        review ? "Recall now" : "Recognition now",
        "Stability",
        review ? "Difficulty" : "Posterior",
        review ? "Last graded" : "Last answered",
        "Back in the queue",
      ]}
      section={section}
      empty={`No term is waiting out a ${review ? "Review" : "Quiz"} cooldown.`}
    >
      {section.rows.map((row) => (
        <tr key={row.item.termId}>
          <TermCell item={row.item} />
          <td>{number(row.retrievability)}</td>
          <td>{number(row.stability, 2)}</td>
          <td>{number(review ? row.difficulty : row.posterior, review ? 2 : 3)}</td>
          <td>
            <When date={row.lastAt} asOf={asOf} />
          </td>
          <td>
            {row.returnsAt ? (
              <When date={row.returnsAt} asOf={asOf} />
            ) : (
              <span className="text-base-content/50">no last time</span>
            )}
          </td>
        </tr>
      ))}
    </Table>
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
        <CooldownTable section={debug.reviewCooldown} asOf={debug.asOf} track="review" />
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="m-0 text-lg font-semibold text-base-content">Quiz</h2>
        <CooldownTable section={debug.quizCooldown} asOf={debug.asOf} track="quiz" />
      </section>
    </div>
  );
}

export function ExcludedTable({ section }: { section: QueueSection<ExcludedRow> }) {
  return (
    <Table head={["Term", "Why it is left out"]} section={section} empty="No term is left out.">
      {section.rows.map(({ item, reasons }) => (
        <tr key={item.termId}>
          <TermCell item={item} />
          <td className="flex flex-wrap gap-1">
            {reasons.map((reason) => (
              <span key={reason} className="badge badge-ghost">
                {REASON_LABELS[reason]}
              </span>
            ))}
          </td>
        </tr>
      ))}
    </Table>
  );
}
