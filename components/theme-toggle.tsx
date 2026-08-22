"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import { useState } from "react";
import { DARK_THEME, LIGHT_THEME, THEME_COOKIE_NAME } from "@/lib/theme";
import { cn } from "@/lib/utils";

const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function ThemeToggle({
  initialIsDark,
  className,
}: {
  initialIsDark: boolean;
  className?: string;
}) {
  const [isDark, setIsDark] = useState(initialIsDark);

  return (
    <label
      className={cn("swap swap-rotate btn btn-ghost btn-square", className)}
      aria-label="Toggle dark mode"
    >
      <input
        type="checkbox"
        value={DARK_THEME}
        className="theme-controller"
        checked={isDark}
        onChange={(event) => {
          const next = event.target.checked;
          const theme = next ? DARK_THEME : LIGHT_THEME;
          setIsDark(next);
          document.documentElement.setAttribute("data-theme", theme);
          document.cookie = `${THEME_COOKIE_NAME}=${theme}; path=/; max-age=${THEME_COOKIE_MAX_AGE}; SameSite=Lax`;
        }}
      />
      <SunIcon className="swap-off size-4" />
      <MoonIcon className="swap-on size-4" />
    </label>
  );
}
