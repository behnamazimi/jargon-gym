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

const STUDY_SCREEN_TITLE_PREFIXES: [string, string][] = [
  ["/jargon/read", "Read"],
  ["/jargon/review", "Review"],
  ["/jargon/quiz", "Quiz"],
  ["/jargon/browse", "Browse"],
  ["/jargon/import", "Import"],
  ["/jargon/mastery", "Mastery"],
  ["/jargon/settings", "Settings"],
  ["/jargon/debug", "Queue debug"],
  ["/admin/collections", "Manage collections"],
  ["/admin/invites", "Invites"],
  ["/admin", "Admin"],
];

export function studyScreenTitle(pathname: string): string {
  if (pathname === "/jargon") return "Library";

  const match = STUDY_SCREEN_TITLE_PREFIXES.find(([prefix]) => pathname.startsWith(prefix));
  return match ? match[1] : "Jargon Gym";
}
