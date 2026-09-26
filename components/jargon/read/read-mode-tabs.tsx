"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { cn } from "@/lib/utils";

const READ_MODES = [
  { href: "/jargon/read", label: "Cards" },
  { href: "/jargon/read/stories", label: "Stories" },
] as const;

function isStoriesPath(pathname: string) {
  return pathname.startsWith("/jargon/read/stories");
}

function ReadModeTabList({ domain }: { domain: string | null }) {
  const pathname = usePathname();
  const activeHref = isStoriesPath(pathname) ? "/jargon/read/stories" : "/jargon/read";
  const query = domain && domain !== "all" ? `?domain=${encodeURIComponent(domain)}` : "";

  return (
    <nav aria-label="Read mode" className="tabs tabs-box tabs-sm w-fit shrink-0">
      {READ_MODES.map((mode) => {
        const active = mode.href === activeHref;
        return (
          <Link
            key={mode.href}
            href={`${mode.href}${query}`}
            aria-current={active ? "page" : undefined}
            className={cn("tab min-h-9 px-4", active && "tab-active")}
          >
            {mode.label}
          </Link>
        );
      })}
    </nav>
  );
}

function ReadModeTabListWithDomain() {
  const searchParams = useSearchParams();
  return <ReadModeTabList domain={searchParams.get("domain")} />;
}

/** Cards ↔ Stories switch at the top of Read. Carries the collection across
 *  so switching modes keeps you in the same context. */
export function ReadModeTabs() {
  return (
    <Suspense fallback={<ReadModeTabList domain={null} />}>
      <ReadModeTabListWithDomain />
    </Suspense>
  );
}
