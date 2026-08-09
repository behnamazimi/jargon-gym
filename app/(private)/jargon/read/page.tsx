import { getNextReadTermAction, getReadTermByIdAction } from "@/app/(private)/jargon/read/actions";
import { ReadPage } from "@/components/jargon/read/read-page";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  searchParams: Promise<{ termId?: string; alreadyRead?: string }>;
};

export default async function JargonReadPage({ searchParams }: PageProps) {
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

  const { termId, alreadyRead } = await searchParams;
  const initialResult = termId
    ? await getReadTermByIdAction(termId, alreadyRead === "true")
    : await getNextReadTermAction();

  return <ReadPage initialResult={initialResult} />;
}
