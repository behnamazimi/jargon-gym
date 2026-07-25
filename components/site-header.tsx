import Link from "next/link";
import { SiteHeaderNav } from "@/components/site-header-nav";
import { createClient } from "@/lib/supabase/server";

export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[900px] items-center justify-between gap-4 px-5 py-3.5">
        <Link
          href={user ? "/jargon" : "/"}
          className="text-[17px] font-bold tracking-tight no-underline"
        >
          <span className="text-primary">Jargon Gym</span>
        </Link>

        <nav className="flex items-center gap-1">
          <SiteHeaderNav email={user?.email ?? null} />
        </nav>
      </div>
    </header>
  );
}
