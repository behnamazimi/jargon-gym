import type { Metadata } from "next";
import { PageShell } from "@/components/page-container";

export const metadata: Metadata = { title: "Add a term" };

export default function CaptureLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageShell innerClassName="landing-enter mx-auto max-w-3xl space-y-6 max-md:space-y-4 max-md:py-4">
      {children}
    </PageShell>
  );
}
