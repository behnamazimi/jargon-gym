"use client";

import { usePathname } from "next/navigation";
import { SkeletonBar } from "@/components/page-skeleton";
import { isDockPath } from "@/lib/chrome";
import { cn } from "@/lib/utils";

/** Stands in for `StudyPhoneDock` while the chrome island loads, so the
 *  dock doesn't pop in after the page. */
export function StudyPhoneDockSkeleton() {
  const pathname = usePathname();

  return (
    <nav
      aria-hidden
      className={cn("dock dock-md pb-safe md:hidden", !isDockPath(pathname) && "hidden")}
    >
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index} className="flex min-h-11 items-center justify-center">
          <SkeletonBar className="size-5 rounded-field" />
        </div>
      ))}
    </nav>
  );
}
