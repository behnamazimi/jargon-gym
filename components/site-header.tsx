import { Compass, Upload } from "lucide-react";
import Link from "next/link";
import { ProfileMenu } from "@/components/jargon/profile-menu";
import { createClient } from "@/lib/supabase/server";

export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="border-b border-border bg-surface/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[900px] items-center justify-between gap-4 px-5 py-3.5">
        <Link
          href={user ? "/jargon" : "/"}
          className="text-[17px] font-bold tracking-tight text-foreground no-underline"
        >
          <span className="text-accent">Jargon Gym</span>
        </Link>

        <nav className="flex items-center gap-1">
          {user ? (
            <>
              <Link
                href="/jargon/import"
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-muted transition-colors hover:bg-black/5 hover:text-foreground"
              >
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline">Import</span>
              </Link>
              <Link
                href="/jargon/browse"
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-muted transition-colors hover:bg-black/5 hover:text-foreground"
              >
                <Compass className="h-4 w-4" />
                <span className="hidden sm:inline">Browse</span>
              </Link>
              <ProfileMenu email={user.email ?? ""} />
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-accent px-3.5 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-accent-emphasis"
            >
              Log in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
