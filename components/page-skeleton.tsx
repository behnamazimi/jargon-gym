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

export function AdminPageSkeleton() {
  return (
    <div
      className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8"
      aria-busy="true"
      aria-label="Loading"
    >
      <SkeletonBar className="h-9 w-64 rounded-lg" />
      <SkeletonBar className="h-7 w-48" />
      <div className="overflow-hidden rounded-lg border border-base-300">
        <div className="divide-y divide-base-300">
          <SkeletonBar className="h-11 w-full rounded-none" />
          <SkeletonBar className="h-11 w-full rounded-none" />
          <SkeletonBar className="h-11 w-full rounded-none" />
        </div>
      </div>
    </div>
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

export function JargonPageSkeleton() {
  return (
    <PageShell aria-busy="true" aria-label="Loading your collection">
      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        <aside className="hidden md:flex md:w-68 md:shrink-0">
          <div className="shadow-surface flex w-full flex-col gap-4 rounded-2xl bg-base-100 p-3">
            <SkeletonBar className="h-9 w-full rounded-lg" />
            <div className="space-y-2">
              <SkeletonBar className="h-9 w-full rounded-lg" />
              <SkeletonBar className="h-9 w-full rounded-lg" />
              <SkeletonBar className="h-9 w-full rounded-lg" />
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1 space-y-4">
          <div className="shadow-surface space-y-4 rounded-2xl bg-base-100 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-2">
                <SkeletonBar className="h-6 w-48" />
                <SkeletonBar className="h-4 w-32" />
              </div>
              <SkeletonBar className="h-8 w-8 shrink-0 rounded-lg" />
            </div>
            <SkeletonBar className="h-2 w-full rounded-full" />
          </div>

          <div className="flex flex-wrap gap-3">
            <SkeletonBar className="h-10 w-full max-w-xs rounded-lg" />
            <SkeletonBar className="h-10 w-24 rounded-lg" />
            <SkeletonBar className="h-10 w-24 rounded-lg" />
          </div>

          <div className="flex flex-col gap-3">
            <SkeletonBar className="h-16 w-full rounded-2xl" />
            <SkeletonBar className="h-16 w-full rounded-2xl" />
            <SkeletonBar className="h-16 w-full rounded-2xl" />
            <SkeletonBar className="h-16 w-full rounded-2xl" />
            <SkeletonBar className="h-16 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    </PageShell>
  );
}
