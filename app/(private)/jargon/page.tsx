import { JargonDataError, loadJargonPageData } from "@/lib/jargon/load-jargon-page-data";
import { createClient } from "@/lib/supabase/server";
import { JargonPage } from "@/components/jargon/jargon-page";

export default async function JargonListPage() {
  const supabase = await createClient();

  try {
    const data = await loadJargonPageData(supabase);
    return <JargonPage initialData={data} />;
  } catch (err) {
    const message =
      err instanceof JargonDataError
        ? err.message
        : err instanceof Error
          ? err.message
          : "Something went wrong while loading jargon terms.";

    return (
      <div className="flex min-h-full items-center justify-center bg-background px-4 py-12 text-foreground">
        <p className="text-sm text-muted">{message}</p>
      </div>
    );
  }
}
