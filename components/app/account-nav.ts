import {
  Compass,
  LayoutDashboard,
  LayoutList,
  Settings,
  Signal,
  Upload,
  BadgeQuestionMark,
  BookOpenText,
  PlayingCardsFan,
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
  { href: "/app/library", label: "Library", icon: LayoutList, match: "library" },
  { href: "/app/read", label: "Read", icon: BookOpenText, match: "prefix" },
  { href: "/app/review", label: "Review", icon: PlayingCardsFan, match: "prefix" },
  { href: "/app/quiz", label: "Quiz", icon: BadgeQuestionMark, match: "prefix" },
] as const;

export const ACCOUNT_OVERFLOW_NAV: AccountNavItem[] = [
  { href: "/app/browse", label: "Browse", icon: Compass },
  { href: "/app/import", label: "Add collection", icon: Upload },
  { href: "/app/mastery", label: "Mastery", icon: Signal },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

export const ACCOUNT_HOME_NAV: AccountNavItem[] = [...ACCOUNT_OVERFLOW_NAV];

export const ADMIN_NAV_ITEMS: AccountNavItem[] = [
  { href: "/admin", label: "Admin panel", icon: LayoutDashboard },
];

const STUDY_SCREEN_TITLE_PREFIXES: [string, string][] = [
  ["/app/read", "Read"],
  ["/app/review", "Review"],
  ["/app/quiz", "Quiz"],
  ["/app/triage", "Triage"],
  ["/app/browse", "Browse"],
  ["/app/import", "Add collection"],
  ["/app/capture", "Add a term"],
  ["/app/mastery", "Mastery"],
  ["/app/settings", "Settings"],
  ["/admin/collections", "Manage collections"],
  ["/admin/people", "People"],
  ["/admin/requests", "Requests"],
  ["/admin/ai/credits", "AI credits"],
  ["/admin/ai/narration", "Narration"],
  ["/admin/ai", "AI features"],
  ["/admin/system/audit", "Audit log"],
  ["/admin/system/queue", "Queue debug"],
  ["/admin/system/health", "Database health"],
  ["/admin", "Admin"],
];

export function studyScreenTitle(pathname: string): string {
  if (pathname === "/app/library") return "Library";

  const match = STUDY_SCREEN_TITLE_PREFIXES.find(([prefix]) => pathname.startsWith(prefix));
  return match ? match[1] : "Lobyas";
}
