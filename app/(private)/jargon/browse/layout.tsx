import { Compass } from "lucide-react";
import { PageHeader } from "@/components/jargon/page-header";
import { PageShell } from "@/components/page-container";

export default function BrowseLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageShell innerClassName="landing-enter mx-auto max-w-3xl max-md:space-y-0 max-md:py-4 max-md:pb-[calc(2rem+env(safe-area-inset-bottom,0px))]">
      <PageHeader
        icon={Compass}
        title="Browse shared collections"
        description="Find collections others have shared and add them to yours."
        compactOnPhone
      />
      {children}
    </PageShell>
  );
}
