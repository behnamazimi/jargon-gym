"use client";

import { createContext, useContext, type ReactNode } from "react";

const RequestsAvailableContext = createContext(false);

/** Says whether this person can send a collection request right now, for screens deep in the
 *  Library that shouldn't each ask the server. */
export function RequestsAvailable({
  available,
  children,
}: {
  available: boolean;
  children: ReactNode;
}) {
  return (
    <RequestsAvailableContext.Provider value={available}>
      {children}
    </RequestsAvailableContext.Provider>
  );
}

export function useRequestsAvailable(): boolean {
  return useContext(RequestsAvailableContext);
}
