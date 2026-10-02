import { cn } from "@/lib/utils";

function SkeletonBar({ className }: { className: string }) {
  return <div aria-hidden className={cn("skeleton bg-base-200", className)} />;
}

export default function BrowseLoading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading shared collections">
      <div className="shadow-surface space-y-3 rounded-box bg-base-100 p-4">
        <SkeletonBar className="h-11 w-full rounded-field" />
        <SkeletonBar className="h-11 w-full rounded-field md:w-80" />
      </div>
      <div className="flex flex-col gap-3">
        <SkeletonBar className="h-28 w-full rounded-box" />
        <SkeletonBar className="h-28 w-full rounded-box" />
        <SkeletonBar className="h-28 w-full rounded-box" />
      </div>
    </div>
  );
}
