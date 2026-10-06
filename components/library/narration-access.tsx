"use client";

import { createContext, Suspense, use, useContext, type ReactNode } from "react";
import { TermNarrationPlayer } from "@/components/terms/term-narration-player";
import { useTermDetails } from "@/lib/library/details-store";

const NarrationAccessContext = createContext<Promise<boolean>>(Promise.resolve(false));

/** Whether narration is on for this person. The server starts the check and
 *  passes the promise, so the list never waits for it. */
export function NarrationAccess({
  access,
  children,
}: {
  access: Promise<boolean>;
  children: ReactNode;
}) {
  return <NarrationAccessContext value={access}>{children}</NarrationAccessContext>;
}

function NarrationButtonInner({ termId }: { termId: string }) {
  const allowed = use(useContext(NarrationAccessContext));
  const details = useTermDetails(termId);
  const clipVersion = details && details !== "failed" ? details.narrationVersion : undefined;
  return allowed ? <TermNarrationPlayer termId={termId} clipVersion={clipVersion} /> : null;
}

export function NarrationButton({ termId }: { termId: string }) {
  return (
    <Suspense fallback={null}>
      <NarrationButtonInner termId={termId} />
    </Suspense>
  );
}
