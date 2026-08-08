import { ReadPage } from "@/components/jargon/read/read-page";
import { createClient } from "@/lib/supabase/server";

export default async function JargonReadPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex min-h-full items-center justify-center px-4 py-12">
        <p className="text-sm text-base-content/60">Log in to read terms.</p>
      </div>
    );
  }

  return <ReadPage />;
}
