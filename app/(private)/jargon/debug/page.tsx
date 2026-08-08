import { DebugQueuePage } from "@/components/jargon/debug/debug-queue-page";
import { getDebugSetupData } from "@/app/(private)/jargon/debug/actions";
import { createClient } from "@/lib/supabase/server";

export default async function JargonDebugPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex min-h-full items-center justify-center px-4 py-12">
        <p className="text-sm text-base-content/60">Log in to view this.</p>
      </div>
    );
  }

  const setup = await getDebugSetupData();

  if ("error" in setup) {
    return (
      <div className="flex min-h-full items-center justify-center px-4 py-12">
        <p className="text-sm text-base-content/60">{setup.error}</p>
      </div>
    );
  }

  return <DebugQueuePage collections={setup.collections} defaultPreset={setup.defaultPreset} />;
}
