"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ADMIN_NAV_ITEMS = [
  { href: "/admin/collections", label: "Collections" },
  { href: "/admin/invites", label: "Invites" },
  { href: "/admin/narration", label: "Narration" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <div role="tablist" className="tabs tabs-boxed w-fit">
      {ADMIN_NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          role="tab"
          className={cn("tab", pathname.startsWith(item.href) && "tab-active")}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
