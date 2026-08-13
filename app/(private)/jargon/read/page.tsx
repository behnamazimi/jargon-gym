import { Suspense } from "react";
import { Zap } from "lucide-react";
import { getNextReadTermAction, getReadTermByIdAction } from "@/app/(private)/jargon/read/actions";
import { PageHeader } from "@/components/jargon/page-header";
import { ReadPage } from "@/components/jargon/read/read-page";
import { PageShell } from "@/components/page-container";

type PageProps = {
  searchParams: Promise<{ termId?: string; alreadyRead?: string }>;
};

function ReadTermFallback() {
  return (
    <div
      className="shadow-surface overflow-hidden rounded-2xl bg-base-100 ring-1 ring-base-content/5"
      aria-busy="true"
      aria-label="Loading term"
    >
      <div className="border-b border-base-300/60 px-5 py-5 sm:px-6">
        <div className="skeleton h-8 w-2/3 bg-base-200" />
        <div className="skeleton mt-3 h-3 w-40 bg-base-200" />
      </div>
      <div className="space-y-3 px-5 py-5 sm:px-6">
        <div className="skeleton h-4 w-full bg-base-200" />
        <div className="skeleton h-4 w-full bg-base-200" />
        <div className="skeleton h-4 w-5/6 bg-base-200" />
        <div className="skeleton h-4 w-full bg-base-200" />
        <div className="skeleton mt-6 h-10 w-28 bg-base-200 ms-auto" />
      </div>
    </div>
  );
}

async function ReadTermLoader({ searchParams }: PageProps) {
  const { termId, alreadyRead } = await searchParams;
  const initialResult = termId
    ? await getReadTermByIdAction(termId, alreadyRead === "true")
    : await getNextReadTermAction();

  if (initialResult.error === "Log in to continue.") {
    return <p className="text-sm text-base-content/60">Log in to read terms.</p>;
  }

  return <ReadPage initialResult={initialResult} />;
}

export default function JargonReadPage({ searchParams }: PageProps) {
  return (
    <PageShell innerClassName="space-y-8">
      <PageHeader
        icon={Zap}
        title="Read"
        description="One term at a time from your active collections — the same feed as /read on Telegram."
      />

      <div className="mx-auto w-full max-w-xl space-y-4">
        <Suspense fallback={<ReadTermFallback />}>
          <ReadTermLoader searchParams={searchParams} />
        </Suspense>
      </div>
    </PageShell>
  );
}
