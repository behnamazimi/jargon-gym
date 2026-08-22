import {
  Bug,
  Compass,
  LayoutList,
  Mail,
  Settings,
  Signal,
  Sparkles,
  SquareLibrary,
  Upload,
  Zap,
  BookOpen,
  type LucideIcon,
} from "lucide-react";

export function emailInitials(email: string): string {
  const local = email.split("@")[0] ?? email;
  const parts = local.split(/[._-]+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return local.slice(0, 2).toUpperCase();
}

export type AccountNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const STUDY_DOCK_TABS = [
  { href: "/jargon", label: "Library", icon: LayoutList, match: "library" },
  { href: "/jargon/read", label: "Read", icon: Zap, match: "prefix" },
  { href: "/jargon/review", label: "Review", icon: BookOpen, match: "prefix" },
  { href: "/jargon/quiz", label: "Quiz", icon: Sparkles, match: "prefix" },
] as const;

export const ACCOUNT_OVERFLOW_NAV: AccountNavItem[] = [
  { href: "/jargon/browse", label: "Browse", icon: Compass },
  { href: "/jargon/import", label: "Import", icon: Upload },
  { href: "/jargon/mastery", label: "Mastery", icon: Signal },
  { href: "/jargon/settings", label: "Settings", icon: Settings },
];

export const ACCOUNT_HOME_NAV: AccountNavItem[] = [
  { href: "/jargon", label: "Collections", icon: LayoutList },
  ...ACCOUNT_OVERFLOW_NAV,
];

export const ADMIN_NAV_ITEMS: AccountNavItem[] = [
  { href: "/jargon/debug", label: "Queue debug", icon: Bug },
  { href: "/admin/collections", label: "Manage collections", icon: SquareLibrary },
  { href: "/admin/invites", label: "Invites", icon: Mail },
];

export function studyScreenTitle(pathname: string): string {
  if (pathname.startsWith("/jargon/read")) return "Read";
  if (pathname.startsWith("/jargon/review")) return "Review";
  if (pathname.startsWith("/jargon/quiz")) return "Quiz";
  if (pathname.startsWith("/jargon/browse")) return "Browse";
  if (pathname.startsWith("/jargon/import")) return "Import";
  if (pathname.startsWith("/jargon/mastery")) return "Mastery";
  if (pathname.startsWith("/jargon/settings")) return "Settings";
  if (pathname.startsWith("/jargon/debug")) return "Queue debug";
  if (pathname.startsWith("/admin/collections")) return "Manage collections";
  if (pathname.startsWith("/admin/invites")) return "Invites";
  if (pathname.startsWith("/admin")) return "Admin";
  if (pathname === "/jargon") return "Library";
  return "Jargon Gym";
}
