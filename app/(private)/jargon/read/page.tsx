import { getNextReadTermAction, getReadTermByIdAction } from "@/app/(private)/jargon/read/actions";
import { ReadPage } from "@/components/jargon/read/read-page";

type PageProps = {
  searchParams: Promise<{ termId?: string; alreadyRead?: string }>;
};

export default async function JargonReadPage({ searchParams }: PageProps) {
  const { termId, alreadyRead } = await searchParams;
  const initialResult = termId
    ? await getReadTermByIdAction(termId, alreadyRead === "true")
    : await getNextReadTermAction();

  if (initialResult.error === "Log in to continue.") {
    return <p className="text-sm text-base-content/60">Log in to read terms.</p>;
  }

  return <ReadPage initialResult={initialResult} />;
}
