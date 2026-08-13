import { Compass } from "lucide-react";
import { PageHeader } from "@/components/jargon/page-header";
import { PageShell } from "@/components/page-container";

export default function BrowseLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageShell innerClassName="landing-enter">
      <PageHeader
        icon={Compass}
        title="Browse shared collections"
        description="Find collections others have shared and add them to yours."
      />
      {children}
    </PageShell>
  );
}
