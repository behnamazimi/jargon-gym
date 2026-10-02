import { SkeletonBar } from "@/components/page-skeleton";

/**
 * Chrome-sized fallback for `StudyPhoneTopBar`. It's `sticky` and occupies
 * real height above page content, so a `null` fallback would shift the page
 * down once the real bar pops in — this reserves the same shape instead.
 */
export function StudyPhoneTopBarSkeleton() {
  return (
    <header
      className="sticky top-0 z-40 border-b border-base-300 bg-base-100/80 pt-safe backdrop-blur-sm md:hidden"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="grid min-h-11 grid-cols-[1fr_auto_1fr] items-center px-3 py-1">
        <div className="flex items-center justify-start">
          <SkeletonBar className="h-8 w-8 rounded-field" />
        </div>
        <div className="col-start-3 flex items-center justify-end gap-2">
          <SkeletonBar className="h-8 w-8 rounded-full" />
        </div>
      </div>
    </header>
  );
}
