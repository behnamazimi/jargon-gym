import { Plus } from "lucide-react";
import { Suspense } from "react";
import { getImportSetupData } from "@/app/(private)/app/import/actions";
import { CaptureFlow } from "@/components/capture/capture-flow";
import { PageHeader } from "@/components/shared/page-header";
import { parseSharedInput } from "@/lib/capture/shared-input";
import { CAPTURE_COPY } from "@/lib/capture/copy";

type PageProps = {
  searchParams: Promise<{ to?: string | string[]; text?: string | string[] }>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CapturePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const to = first(params.to);
  const text = first(params.text);
  const setup = await getImportSetupData();

  if ("error" in setup) {
    return <p className="text-sm text-base-content/70">{setup.error}</p>;
  }

  return (
    <>
      <PageHeader
        icon={Plus}
        title={CAPTURE_COPY.title}
        backHref="/app/import"
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
