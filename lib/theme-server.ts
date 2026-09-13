import { cookies } from "next/headers";
import { DARK_THEME, LIGHT_THEME, THEME_COOKIE_NAME } from "@/lib/theme";

/** Cheap cookie-only read — no network I/O — so `<html data-theme>` never waits on auth. */
export async function getTheme(): Promise<typeof DARK_THEME | typeof LIGHT_THEME> {
  const cookieStore = await cookies();
  const value = cookieStore.get(THEME_COOKIE_NAME)?.value;
  return value === DARK_THEME ? DARK_THEME : LIGHT_THEME;
}
