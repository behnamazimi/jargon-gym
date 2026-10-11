import type { ReactNode } from "react";
import Link from "next/link";
import { BadgeQuestionMark, BookOpenText, LayoutList, PlayingCardsFan } from "lucide-react";
import { BrandIcon } from "@/components/brand-icon";
import { Wordmark } from "@/components/illustrations/scenes/lobya-mark";
import { pageContainerClass } from "@/components/page-container";
import { ProfileMenu } from "@/components/settings/profile-menu";
import { InstallButton } from "@/components/pwa/install-prompt";
import {
  FeaturesNavLink,
  HeaderStudyLink,
  LoggedOutHeaderNav,
  SignedInHeaderNav,
  StudyPathOnly,
} from "@/components/site-header-nav";
import { StreakBadge } from "@/components/streak-badge";
import type { StreakSummary } from "@/lib/streak/status";
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
    <header
      className="border-b border-base-300 bg-base-100/80 backdrop-blur-sm"
      style={{ viewTransitionName: "site-header" }}
    >
      <div className={cn(pageContainerClass, "flex items-center justify-between gap-4 py-4")}>
        <div className="flex items-center gap-4">
          <Link
            href={homeHref}
            className="flex items-center gap-2 text-lg font-bold tracking-tight no-underline"
            aria-label="Lobyas"
          >
            <BrandIcon className="lg:hidden" />
            <Wordmark className="hidden h-9 w-auto lg:block" />
          </Link>
          {leftNav}
        </div>

        <nav className="flex items-center gap-1">{rightNav}</nav>
      </div>
    </header>
  );
}

export function SiteHeader({
  initialIsDark,
  user,
  isAdmin,
  streak,
  aiCreditsMode,
}: {
  initialIsDark: boolean;
  user: { email?: string | null } | null;
  isAdmin: boolean;
  streak: StreakSummary;
  aiCreditsMode: AiCreditsMenuMode;
}) {
  return (
    <SiteHeaderChrome
      homeHref={user ? AUTHENTICATED_HOME_PATH : "/"}
      leftNav={
        user ? (
          <SignedInHeaderNav>
            <HeaderStudyLink
              href="/app/library"
              icon={<LayoutList className="h-4 w-4" strokeWidth={1.5} />}
              label="Library"
            />
            <HeaderStudyLink
              href="/app/read"
              icon={<BookOpenText className="h-4 w-4" strokeWidth={1.5} />}
              label="Read"
            />
            <HeaderStudyLink
              href="/app/review"
              icon={<PlayingCardsFan className="h-4 w-4" strokeWidth={1.5} />}
              label="Review"
            />
            <HeaderStudyLink
              href="/app/quiz"
              icon={<BadgeQuestionMark className="h-4 w-4" strokeWidth={1.5} />}
              label="Quiz"
            />
          </SignedInHeaderNav>
        ) : (
          <FeaturesNavLink />
        )
      }
      rightNav={
        <>
          {user ? (
            <StudyPathOnly>
              <StreakBadge streak={streak} />
            </StudyPathOnly>
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
