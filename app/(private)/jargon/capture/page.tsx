import { Plus } from "lucide-react";
import { Suspense } from "react";
import { getImportSetupData } from "@/app/(private)/jargon/import/actions";
import { CaptureFlow } from "@/components/jargon/capture/capture-flow";
import { PageHeader } from "@/components/jargon/page-header";
import { parseSharedInput } from "@/lib/jargon/capture/shared-input";
import { CAPTURE_COPY } from "@/lib/jargon/capture/copy";

type PageProps = {
  searchParams: Promise<{ to?: string; text?: string }>;
};

export default async function CapturePage({ searchParams }: PageProps) {
  const { to, text } = await searchParams;
  const setup = await getImportSetupData();

  if ("error" in setup) {
    return <p className="text-sm text-base-content/60">{setup.error}</p>;
  }

  return (
    <>
      <PageHeader
        icon={Plus}
        title={CAPTURE_COPY.title}
        backHref="/jargon/import"
        backLabel="Add a collection"
        compactOnPhone
      />
      <Suspense>
        <CaptureFlow
          collections={setup.collections}
          presetId={to ?? null}
          shared={parseSharedInput({ text })}
        />
      </Suspense>
    </>
  );
}
