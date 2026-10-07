"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { isDockPath } from "@/lib/chrome";
import {
  CONSENT_BANNER_ID,
  setConsent,
  takeConsentFocusRequest,
  useConsentPromptOpen,
} from "@/lib/consent/store";
import { PRIVACY_PATH } from "@/lib/site";
import { cn } from "@/lib/utils";

export function ConsentBanner() {
  const open = useConsentPromptOpen();
  const pathname = usePathname();

  if (!open) return null;

  return (
    <section
      id={CONSENT_BANNER_ID}
      ref={(element) => {
        if (element && takeConsentFocusRequest()) element.focus();
      }}
      tabIndex={-1}
      aria-label="Analytics choice"
      className={cn(
        "shadow-surface fixed left-4 z-50 outline-none w-[calc(100%-2rem)] max-w-xs rounded-box border border-base-300 bg-base-100 p-4 text-sm",
        isDockPath(pathname)
          ? "bottom-[calc(var(--dock-bottom)+0.75rem)] md:bottom-4"
          : "bottom-[calc(var(--safe-bottom,0px)+1rem)]",
      )}
    >
      <p className="m-0 text-base-content/80">
        Help improve Lobyas? Allowing analytics saves an ID on this device and shares which features
        you use and any errors with PostHog.{" "}
        <Link href={PRIVACY_PATH} className="underline underline-offset-2">
          Privacy
        </Link>
      </p>
      <div className="mt-3 flex gap-2">
        <Button type="button" size="sm" variant="outline" onPress={() => setConsent("denied")}>
          Decline
        </Button>
        <Button type="button" size="sm" variant="outline" onPress={() => setConsent("granted")}>
          Allow
        </Button>
      </div>
    </section>
  );
}
