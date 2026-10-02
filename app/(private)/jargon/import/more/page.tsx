import { Braces } from "lucide-react";
import { CopyIconButton } from "@/components/jargon/import/copy-icon-button";
import { ImportCodePanel, ImportCard } from "@/components/jargon/import/import-ui";
import { ImportLlmPrompt } from "@/components/jargon/import/import-llm-prompt";
import { PageHeader } from "@/components/jargon/page-header";
import { requireAuthenticatedClient } from "@/lib/auth/require-session";
import { listImportDestinations } from "@/lib/jargon/import/import-collections";
import { IMPORT_SAMPLE_PAYLOAD, stringifyImportPayload } from "@/lib/jargon/import/sample-payload";

export default async function MoreImportOptionsPage() {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) {
    return <p className="text-sm text-base-content/70">Sign in to add terms.</p>;
  }
  // The page is mostly documentation, so it still opens if the list can't load.
  const collections = await listImportDestinations(auth.supabase, auth.user.id)
    .then((result) => result.collections)
    .catch(() => []);

  const sampleJson = stringifyImportPayload(IMPORT_SAMPLE_PAYLOAD);

  return (
    <>
      <PageHeader
        icon={Braces}
        title="More import options"
        backHref="/jargon/import"
        backLabel="Add a collection"
        compactOnPhone
      />
      <ImportCard
        icon={<Braces aria-hidden strokeWidth={1.5} />}
        title="Choose a JSON file"
        description="JSON works in the same place as any list. Paste it or choose the file there. Term is the only required field. Definition, category, example, mental model, in practice, anti-example, debated, note and links to other terms are optional."
      >
        <h3 className="m-0 text-sm font-medium">The JSON format</h3>
        <ImportCodePanel actions={<CopyIconButton value={sampleJson} label="Copy JSON" />}>
          {sampleJson}
        </ImportCodePanel>
      </ImportCard>
      <ImportLlmPrompt collections={collections} />
    </>
  );
}
