import type { ReactNode } from "react";
import Link from "next/link";
import { BookOpen, Sparkles, Zap } from "lucide-react";
import { BrandIcon } from "@/components/brand-icon";
import { pageContainerClass } from "@/components/page-container";
import { ProfileMenu } from "@/components/jargon/profile-menu";
import { InstallButton } from "@/components/pwa/install-prompt";
import { LoggedOutHeaderNav } from "@/components/site-header-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { getSessionUser, getUserIsAdmin } from "@/lib/auth/require-session";
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
      <div className={cn(pageContainerClass, "flex items-center justify-between gap-4 py-3.5")}>
        <div className="flex items-center gap-4">
          <Link
            href={homeHref}
            className="flex items-center gap-2 text-lg font-bold tracking-tight no-underline"
            aria-label="Jargon Gym"
          >
            <BrandIcon className="md:hidden" />
            <span className="hidden text-primary md:inline">Jargon Gym</span>
          </Link>
          {leftNav ? <nav className="flex items-center gap-1">{leftNav}</nav> : null}
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
}: {
  href: string;
  icon: typeof Sparkles;
  label: string;
}) {
  return (
    <Link href={href} className="btn btn-ghost">
      <Icon className="h-4 w-4" strokeWidth={1.5} />
      <span className="hidden md:inline">{label}</span>
    </Link>
  );
}

export async function SiteHeader({ initialIsDark }: { initialIsDark: boolean }) {
  const { user } = await getSessionUser();
  const isAdmin = user ? await getUserIsAdmin(user.id) : false;

  return (
    <SiteHeaderChrome
      homeHref={user ? "/jargon" : "/"}
      leftNav={
        user ? (
          <>
            <HeaderStudyLink href="/jargon/read" icon={Zap} label="Read" />
            <HeaderStudyLink href="/jargon/review" icon={BookOpen} label="Review" />
            <HeaderStudyLink href="/jargon/quiz" icon={Sparkles} label="Quiz" />
          </>
        ) : null
      }
      rightNav={
        <>
          <InstallButton />
          <ThemeToggle initialIsDark={initialIsDark} />
          {user ? (
            <ProfileMenu email={user.email ?? "Account"} isAdmin={isAdmin} />
          ) : (
            <LoggedOutHeaderNav />
          )}
        </>
      }
    />
  );
}
