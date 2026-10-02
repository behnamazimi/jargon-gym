import { SkeletonBar } from "@/components/page-skeleton";

export default function ReviewLoading() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3" aria-busy="true" aria-label="Loading">
      <div className="flex shrink-0 items-center justify-between gap-2">
        <SkeletonBar className="h-9 w-40 rounded-field" />
        <div className="flex items-center gap-1">
          <SkeletonBar className="size-11 rounded-field md:size-8" />
        </div>
      </div>
      <SkeletonBar className="min-h-0 flex-1 rounded-box" />
    </div>
  );
}
