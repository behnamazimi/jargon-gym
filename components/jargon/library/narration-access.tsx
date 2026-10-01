"use client";

import { createContext, Suspense, use, useContext, type ReactNode } from "react";
import { TermNarrationPlayer } from "@/components/jargon/term-narration-player";

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
  return allowed ? <TermNarrationPlayer termId={termId} /> : null;
}

export function NarrationButton({ termId }: { termId: string }) {
  return (
    <Suspense fallback={null}>
      <NarrationButtonInner termId={termId} />
    </Suspense>
  );
}
