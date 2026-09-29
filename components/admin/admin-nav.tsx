"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";
import { ADMIN_SECTION_GROUPS, isSectionActive } from "@/components/admin/admin-sections";
import { cn } from "@/lib/utils";

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin" className="min-w-0">
      <ul className="menu menu-horizontal w-full flex-nowrap overflow-x-auto rounded-box bg-base-100 p-1 ring-1 ring-base-content/10 md:menu-vertical md:overflow-visible">
        {ADMIN_SECTION_GROUPS.map((group) => (
          <Fragment key={group.title ?? "top"}>
            {group.title ? <li className="menu-title max-md:hidden">{group.title}</li> : null}
            {group.sections.map((section) => {
              const active = isSectionActive(pathname, section);
              const Icon = section.icon;
              return (
                <li key={section.href}>
                  <Link
                    href={section.href}
                    aria-current={active ? "page" : undefined}
                    className={cn("gap-2 whitespace-nowrap", active && "menu-active")}
                  >
                    <Icon className="size-4" aria-hidden strokeWidth={1.5} />
                    {section.label}
                  </Link>
                </li>
              );
            })}
          </Fragment>
        ))}
      </ul>
    </nav>
  );
}
