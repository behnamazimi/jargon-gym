import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { MemberPicker } from "@/components/admin/queue/member-picker";
import {
  CooldownTables,
  ExcludedTable,
  QuizTable,
  ReadTable,
  ReviewTable,
} from "@/components/admin/queue/queue-tables";
import { RefreshButton } from "@/components/admin/queue/refresh-button";
import { formatAdminDateTime } from "@/lib/admin/format";
import { requireAdminPage } from "@/lib/admin/page-guard";
import { listMembers } from "@/lib/admin/people/members";
import { buildQueueDebug } from "@/lib/admin/queue-debug/build";
import { loadMemberEmail, loadQueueDebugTerms } from "@/lib/admin/queue-debug/load";
import {
  parseQueueParams,
  queueHref,
  QUEUE_LIMITS,
  QUEUE_TABS,
  type QueueTab,
} from "@/lib/admin/queue-debug/params";
import { DEFAULT_QUIZ_QUESTION_COUNT } from "@/lib/quiz/setup-preference";
import { READ_FEED_BATCH_SIZE } from "@/lib/read/feed-size";
import { REVIEW_QUEUE_BUFFER_SIZE } from "@/lib/review/queue";

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const TAB_LABELS: Record<QueueTab, string> = {
  read: "Read",
  review: "Review",
  quiz: "Quiz",
  cooldown: "Cooldown",
  excluded: "Left out",
};

export default async function AdminQueuePage({ searchParams }: PageProps) {
  const { supabase } = await requireAdminPage();
  const params = parseQueueParams(await searchParams);

  const header = (
    <AdminPageHeader
      title="Queue debug"
      description="What Read, Review and Quiz would serve a member right now, and what is held back."
    />
  );

  if (!params.userId) {
    const { rows } = await listMembers(supabase, { q: params.q, page: 1 });
    return (
      <>
        {header}
        <MemberPicker query={params.q} rows={rows} />
      </>
    );
  }

  const [email, terms] = await Promise.all([
    loadMemberEmail(supabase, params.userId),
    loadQueueDebugTerms(supabase, params.userId),
  ]);

  if (email === null) {
    return (
      <>
        {header}
        <p className="m-0">
          No member has that id.{" "}
          <Link href={queueHref({})} className="link">
            Pick another
          </Link>
        </p>
      </>
    );
  }

  const debug = buildQueueDebug(terms, {
    now: new Date(),
    domainId: params.domainId,
    limit: params.limit,
    batch: {
      read: READ_FEED_BATCH_SIZE,
      review: REVIEW_QUEUE_BUFFER_SIZE,
      quiz: DEFAULT_QUIZ_QUESTION_COUNT,
    },
  });

  const collections = [...new Map(terms.map((t) => [t.domainId, t])).values()].sort((a, b) =>
    a.domainName.localeCompare(b.domainName),
  );
  const counts: Record<QueueTab, number> = {
    read: debug.read.total,
    review: debug.review.total,
    quiz: debug.quiz.total,
    cooldown: debug.reviewCooldown.total + debug.quizCooldown.total,
    excluded: debug.excluded.total,
  };

  return (
    <>
      {header}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="m-0 font-medium text-base-content">{email}</p>
          <p className="m-0 text-sm text-base-content/65">
            As of {formatAdminDateTime(debug.asOf.toISOString())} · {debug.eligible} terms can be
            served
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={queueHref({})} className="btn btn-sm btn-ghost">
            Change member
          </Link>
          <RefreshButton />
        </div>
      </div>
      <form action="/admin/system/queue" method="get" className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="user" value={params.userId} />
        <input type="hidden" name="tab" value={params.tab} />
        <label className="flex flex-col gap-1 text-sm">
          <span>Collection</span>
          <select name="domain" defaultValue={params.domainId ?? ""} className="select select-sm">
            <option value="">All collections</option>
            {collections.map((c) => (
              <option key={c.domainId} value={c.domainId}>
                {c.domainName}
                {c.active ? "" : " (off)"}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>Rows</span>
          <select name="limit" defaultValue={params.limit} className="select select-sm">
            {QUEUE_LIMITS.map((limit) => (
              <option key={limit} value={limit}>
                {limit}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="btn btn-sm">
          Apply
        </button>
      </form>
      <AdminTabs
        label="Queue"
        tabs={QUEUE_TABS.map((tab) => ({
          href: queueHref({ ...params, tab }),
          label: `${TAB_LABELS[tab]} (${counts[tab]})`,
          active: params.tab === tab,
        }))}
      />
      {params.tab === "read" ? <ReadTable section={debug.read} asOf={debug.asOf} /> : null}
      {params.tab === "review" ? <ReviewTable section={debug.review} asOf={debug.asOf} /> : null}
      {params.tab === "quiz" ? <QuizTable section={debug.quiz} asOf={debug.asOf} /> : null}
      {params.tab === "cooldown" ? <CooldownTables debug={debug} /> : null}
      {params.tab === "excluded" ? <ExcludedTable section={debug.excluded} /> : null}
    </>
  );
}
