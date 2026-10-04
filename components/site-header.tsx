import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, LayoutList, Sparkles, Zap } from "lucide-react";
import { BrandIcon } from "@/components/brand-icon";
import { pageContainerClass } from "@/components/page-container";
import { ProfileMenu } from "@/components/settings/profile-menu";
import { InstallButton } from "@/components/pwa/install-prompt";
import { HiddenUntilSignupComplete, LoggedOutHeaderNav } from "@/components/site-header-nav";
import { StreakBadge } from "@/components/streak-badge";
import { ThemeToggle } from "@/components/theme-toggle";
import type { AiCreditsMenuMode } from "@/lib/ai-credits/menu-line";
import { AUTHENTICATED_HOME_PATH } from "@/lib/auth/safe-next-path";
import { cn } from "@/lib/utils";

function SiteHeaderChrome({
  homeHref,
  leftNav,
  rightNav,
}: {
  homeHref: string;
  leftNav?: ReactNode;
  rightNav: ReactNode;
}) {
  return (
    <header className="border-b border-base-300 bg-base-100/80 backdrop-blur-sm">
      <div className={cn(pageContainerClass, "flex items-center justify-between gap-4 py-4")}>
        <div className="flex items-center gap-4">
          <Link
            href={homeHref}
            className="flex items-center gap-2 text-lg font-bold tracking-tight no-underline"
            aria-label="Lobyas"
          >
            <BrandIcon className="lg:hidden" />
            <span className="hidden whitespace-nowrap text-primary-text lg:inline">Lobyas</span>
          </Link>
          {leftNav}
        </div>

        <nav className="flex items-center gap-1">{rightNav}</nav>
      </div>
    </header>
  );
}

function HeaderStudyLink({
  href,
  icon: Icon,
  label,
  className,
}: {
  href: string;
  icon: typeof Sparkles;
  label: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      data-tour={`nav-${label.toLowerCase()}`}
      className={cn("btn btn-ghost", className)}
    >
      <Icon className="h-4 w-4" strokeWidth={1.5} />
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );
}

export function SiteHeader({
  initialIsDark,
  user,
  isAdmin,
  currentStreak,
  longestStreak,
  aiCreditsMode,
}: {
  initialIsDark: boolean;
  user: { email?: string | null } | null;
  isAdmin: boolean;
  currentStreak: number;
  longestStreak: number;
  aiCreditsMode: AiCreditsMenuMode;
}) {
  return (
    <SiteHeaderChrome
      homeHref={user ? AUTHENTICATED_HOME_PATH : "/"}
      leftNav={
        user ? (
          <>
            {/* Phones get one link into the app instead of four study icons. */}
            <HiddenUntilSignupComplete className="md:hidden">
              <Link href={AUTHENTICATED_HOME_PATH} className="btn btn-ghost">
                Open app
                <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
              </Link>
            </HiddenUntilSignupComplete>
            <HiddenUntilSignupComplete className="max-md:hidden">
              <HeaderStudyLink href="/app/library" icon={LayoutList} label="Library" />
              <HeaderStudyLink href="/app/read" icon={Zap} label="Read" />
              <HeaderStudyLink href="/app/review" icon={BookOpen} label="Review" />
              <HeaderStudyLink href="/app/quiz" icon={Sparkles} label="Quiz" />
            </HiddenUntilSignupComplete>
          </>
        ) : null
      }
      rightNav={
        <>
          {user ? (
            <span className="max-md:hidden">
              <StreakBadge currentStreak={currentStreak} longestStreak={longestStreak} />
            </span>
          ) : null}
          {user ? null : <InstallButton />}
          <ThemeToggle initialIsDark={initialIsDark} />
          {user ? (
            <ProfileMenu
              email={user.email ?? "Account"}
              isAdmin={isAdmin}
              aiCreditsMode={aiCreditsMode}
            />
          ) : (
            <LoggedOutHeaderNav />
          )}
        </>
      }
    />
  );
}
