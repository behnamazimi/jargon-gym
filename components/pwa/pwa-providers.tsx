"use client";

import { SerwistProvider } from "@serwist/turbopack/react";
import type { ReactNode } from "react";
import { PwaInstallProvider } from "@/components/pwa/install-prompt";

export function PwaProviders({ children }: { children: ReactNode }) {
  return (
    <SerwistProvider swUrl="/serwist/sw.js" disable={process.env.NODE_ENV === "development"}>
      <PwaInstallProvider>{children}</PwaInstallProvider>
    </SerwistProvider>
  );
}
