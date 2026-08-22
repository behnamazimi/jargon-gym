import { HintPopover } from "@/components/jargon/hint-popover";
import { getSessionUser } from "@/lib/auth/require-session";
import { getNextBestActionHints } from "@/lib/smart-queue/next-best-action";

export default async function PrivateLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { supabase, user } = await getSessionUser();
  const hints = user ? await getNextBestActionHints(supabase, user.id) : [];

  return (
    <>
      {children}
      {hints.length > 0 && <HintPopover hints={hints} />}
    </>
  );
}
