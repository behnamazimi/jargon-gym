"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { syncAuthAttribute } from "@/lib/auth/auth-state";

/** Logging in or out is a soft navigation, so the page isn't reloaded to pick up the new cookie. */
export function AuthStateSync() {
  const pathname = usePathname();

  useEffect(() => {
    syncAuthAttribute();
    window.addEventListener("focus", syncAuthAttribute);
    return () => window.removeEventListener("focus", syncAuthAttribute);
  }, [pathname]);

  return null;
}
