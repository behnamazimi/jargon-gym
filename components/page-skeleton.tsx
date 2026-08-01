import { PageShell } from "@/components/page-container";
import { cn } from "@/lib/utils";

function SkeletonBar({ className }: { className: string }) {
  return <div aria-hidden className={cn("skeleton bg-base-200", className)} />;
}

export function PageSkeleton() {
  return (
    <PageShell innerClassName="space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading page</span>

      <div className="flex flex-col gap-4">
        <SkeletonBar className="h-20 max-w-full" />
      </div>

      <div className="flex flex-wrap gap-4">
        <SkeletonBar className="h-10 w-full max-w-xs" />
        <SkeletonBar className="h-10 w-28 max-w-full" />
        <SkeletonBar className="h-10 w-28 max-w-full" />
      </div>
    </PageShell>
  );
}
