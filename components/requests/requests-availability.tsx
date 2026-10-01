"use client";

import { createContext, use, useContext, type ReactNode } from "react";

const RequestsAvailableContext = createContext<Promise<boolean>>(Promise.resolve(false));

/** Says whether this person can send a collection request right now, for screens deep in the
 *  Library that shouldn't each ask the server. The server starts the check and passes the
 *  promise, so nothing waits for it until a screen actually needs the answer. */
export function RequestsAvailable({
  available,
  children,
}: {
  available: Promise<boolean>;
  children: ReactNode;
}) {
  return <RequestsAvailableContext value={available}>{children}</RequestsAvailableContext>;
}

/** Suspends until the answer is in; wrap the caller in <Suspense>. */
export function useRequestsAvailable(): boolean {
  return use(useContext(RequestsAvailableContext));
}
