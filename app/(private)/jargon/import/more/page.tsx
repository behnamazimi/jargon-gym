import { Braces } from "lucide-react";
import { ImportCodePanel, ImportCard } from "@/components/jargon/import/import-ui";
import { ImportLlmPrompt } from "@/components/jargon/import/import-llm-prompt";
import { PageHeader } from "@/components/jargon/page-header";
import { LinkButton } from "@/components/ui/button";
import { requireAuthenticatedClient } from "@/lib/auth/require-session";
import { listOwnedCollectionsForImport } from "@/lib/jargon/import/owned-collections";
import { IMPORT_SAMPLE_PAYLOAD, stringifyImportPayload } from "@/lib/jargon/import/sample-payload";

export default async function MoreImportOptionsPage() {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) {
    return <p className="text-sm text-base-content/60">Sign in to add terms.</p>;
  }
  const collections = await listOwnedCollectionsForImport(auth.supabase, auth.user.id);

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
        icon={Braces}
        title="Choose a JSON file"
        description="JSON works in the same place as any list. Paste it or choose the file there. Term is the only required field. Definition, category, example, mental model, in practice, anti-example, debated, note and links to other terms are optional."
      >
        <LinkButton href="/jargon/import/paste" className="min-h-11 w-full md:w-auto">
          Paste or choose a file
        </LinkButton>
        <h3 className="m-0 text-sm font-semibold">The JSON format</h3>
        <ImportCodePanel>{stringifyImportPayload(IMPORT_SAMPLE_PAYLOAD)}</ImportCodePanel>
      </ImportCard>
      <ImportLlmPrompt collections={collections} />
    </>
  );
}
