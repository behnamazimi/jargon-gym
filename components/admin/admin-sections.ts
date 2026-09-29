import { Bug, Coins, LayoutDashboard, Library, Mail, Volume2, type LucideIcon } from "lucide-react";

type AdminSection = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Extra path prefixes that keep this section highlighted. */
  matchPrefixes?: string[];
};

type AdminSectionGroup = { title: string | null; sections: AdminSection[] };

export const ADMIN_SECTION_GROUPS: AdminSectionGroup[] = [
  {
    title: null,
    sections: [{ href: "/admin", label: "Overview", icon: LayoutDashboard }],
  },
  {
    title: "Manage",
    sections: [
      { href: "/admin/collections", label: "Collections", icon: Library },
      { href: "/admin/invites", label: "Invites", icon: Mail },
    ],
  },
  {
    title: "AI",
    sections: [
      { href: "/admin/ai-credits", label: "AI credits", icon: Coins },
      { href: "/admin/narration", label: "Narration", icon: Volume2 },
    ],
  },
  {
    title: "System",
    sections: [{ href: "/jargon/debug", label: "Queue debug", icon: Bug }],
  },
];

function underPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** The Overview matches only itself; every other section matches its own path and anything below it. */
export function isSectionActive(pathname: string, section: AdminSection): boolean {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  if (section.href === "/admin") return path === "/admin";
  return [section.href, ...(section.matchPrefixes ?? [])].some((prefix) =>
    underPrefix(path, prefix),
  );
}
