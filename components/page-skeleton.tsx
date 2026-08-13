import { PageShell } from "@/components/page-container";
import { cn } from "@/lib/utils";

function SkeletonBar({ className }: { className: string }) {
  return <div aria-hidden className={cn("skeleton bg-base-200", className)} />;
}

export function PageSkeleton() {
  return (
    <PageShell innerClassName="space-y-6" aria-busy="true" aria-label="Loading">
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

export function PanelSkeleton() {
  return (
    <div
      className="shadow-surface overflow-hidden rounded-2xl bg-base-100 ring-1 ring-base-content/5"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="space-y-3 px-5 py-5 sm:px-6">
        <SkeletonBar className="h-4 w-40" />
        <SkeletonBar className="h-16 w-full" />
        <SkeletonBar className="h-16 w-full" />
        <SkeletonBar className="mt-4 h-10 w-full max-w-md" />
      </div>
    </div>
  );
}
