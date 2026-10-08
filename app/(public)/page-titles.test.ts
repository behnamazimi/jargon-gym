import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const PAGES: [string, string][] = [
  ["login/page.tsx", "Log in"],
  ["signup/page.tsx", "Sign up"],
  ["complete-signup/page.tsx", "Complete sign up"],
  ["request-access/page.tsx", "Request access"],
  ["forgot-password/page.tsx", "Forgot password"],
  ["reset-password/page.tsx", "Reset password"],
];

describe("auth page titles", () => {
  it.each(PAGES)("%s sets its own title", (file, title) => {
    const source = readFileSync(join(__dirname, file), "utf8");
    expect(source).toContain(`title: "${title}"`);
  });
});
