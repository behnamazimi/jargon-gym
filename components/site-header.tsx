import Link from "next/link";
import { cookies } from "next/headers";
import { BrandIcon } from "@/components/brand-icon";
import { pageContainerClass } from "@/components/page-container";
import { SiteHeaderNav } from "@/components/site-header-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { createClient } from "@/lib/supabase/server";
import { DARK_THEME, THEME_COOKIE_NAME } from "@/lib/theme";
import { cn } from "@/lib/utils";

export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const cookieStore = await cookies();
  const isDark = cookieStore.get(THEME_COOKIE_NAME)?.value === DARK_THEME;

  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    isAdmin = profile?.role === "admin";
  }

  return (
    <header className="border-b border-base-300 bg-base-100/80 backdrop-blur-sm">
      <div className={cn(pageContainerClass, "flex items-center justify-between gap-4 py-3.5")}>
        <Link
          href={user ? "/jargon" : "/"}
          className="flex items-center gap-2 text-lg font-bold tracking-tight no-underline"
          aria-label="Jargon Gym"
        >
          <BrandIcon className="sm:hidden" />
          <span className="hidden text-primary sm:inline">Jargon Gym</span>
        </Link>

        <nav className="flex items-center gap-1">
          <ThemeToggle initialIsDark={isDark} />
          <SiteHeaderNav email={user?.email ?? null} isAdmin={isAdmin} />
        </nav>
      </div>
    </header>
  );
}
