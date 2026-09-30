"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import { useSyncExternalStore } from "react";
import { DARK_THEME, LIGHT_THEME, THEME_COOKIE_NAME } from "@/lib/theme";
import { cn } from "@/lib/utils";

const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** `<html data-theme>` is the one source of truth, so the header toggle and
 *  the phone menu toggle always agree. */
function subscribeToTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

function readIsDark() {
  return document.documentElement.getAttribute("data-theme") === DARK_THEME;
}

export function ThemeToggle({
  initialIsDark,
  className,
}: {
  initialIsDark: boolean;
  className?: string;
}) {
  const isDark = useSyncExternalStore(subscribeToTheme, readIsDark, () => initialIsDark);

  return (
    <label
      className={cn("swap swap-rotate btn btn-ghost btn-square", className)}
      aria-label="Toggle dark mode"
    >
      <input
        type="checkbox"
        checked={isDark}
        onChange={(event) => {
          const next = event.target.checked;
          const theme = next ? DARK_THEME : LIGHT_THEME;
          document.documentElement.setAttribute("data-theme", theme);
          document.cookie = `${THEME_COOKIE_NAME}=${theme}; path=/; max-age=${THEME_COOKIE_MAX_AGE}; SameSite=Lax`;
        }}
      />
      <SunIcon className="swap-off size-4" />
      <MoonIcon className="swap-on size-4" />
    </label>
  );
}
