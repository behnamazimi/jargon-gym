import {
  Bug,
  Coins,
  LayoutDashboard,
  Library,
  Sparkles,
  Users,
  Volume2,
  type LucideIcon,
} from "lucide-react";

type AdminSection = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Highlighted only on its own path, not on pages below it. */
  exact?: boolean;
  /** Extra path prefixes that keep this section highlighted. */
  matchPrefixes?: string[];
};

type AdminSectionGroup = { title: string | null; sections: AdminSection[] };

export const ADMIN_SECTION_GROUPS: AdminSectionGroup[] = [
  {
    title: null,
    sections: [{ href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true }],
  },
  {
    title: "Manage",
    sections: [
      { href: "/admin/collections", label: "Collections", icon: Library },
      { href: "/admin/people", label: "People", icon: Users },
    ],
  },
  {
    title: "AI",
    sections: [
      { href: "/admin/ai", label: "AI features", icon: Sparkles, exact: true },
      { href: "/admin/ai/credits", label: "Credits", icon: Coins },
      { href: "/admin/ai/narration", label: "Narration", icon: Volume2 },
    ],
  },
  {
    title: "System",
    sections: [{ href: "/admin/system/queue", label: "Queue debug", icon: Bug }],
  },
];

function underPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** An exact section matches only its own path; every other matches its own path and anything below it. */
export function isSectionActive(pathname: string, section: AdminSection): boolean {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  if (section.exact) return path === section.href;
  return [section.href, ...(section.matchPrefixes ?? [])].some((prefix) =>
    underPrefix(path, prefix),
  );
}
