"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { cn } from "@/lib/utils";

// Cards passes view=cards so an unread story doesn't redirect it back to Stories.
const READ_MODES: { href: string; label: string; params: Record<string, string> }[] = [
  { href: "/jargon/read", label: "Cards", params: { view: "cards" } },
  { href: "/jargon/read/stories", label: "Stories", params: {} },
];

function hrefFor(path: string, params: Record<string, string>): string {
  const query = new URLSearchParams(params).toString();
  return query ? `${path}?${query}` : path;
}

function isStoriesPath(pathname: string) {
  return pathname.startsWith("/jargon/read/stories");
}

function ReadModeTabList({ domain }: { domain: string | null }) {
  const pathname = usePathname();
  const activeHref = isStoriesPath(pathname) ? "/jargon/read/stories" : "/jargon/read";
  const domainParam: Record<string, string> = domain && domain !== "all" ? { domain } : {};

  return (
    <nav aria-label="Read mode" className="tabs tabs-box tabs-sm w-fit shrink-0">
      {READ_MODES.map((mode) => {
        const active = mode.href === activeHref;
        return (
          <Link
            key={mode.href}
            href={hrefFor(mode.href, { ...mode.params, ...domainParam })}
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
