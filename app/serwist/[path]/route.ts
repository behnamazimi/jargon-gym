import { spawnSync } from "node:child_process";
import { createSerwistRoute } from "@serwist/turbopack";

function precacheRevision() {
  const fromVercel = process.env.VERCEL_GIT_COMMIT_SHA?.trim();
  if (fromVercel) return fromVercel;

  const git = spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" });
  const hash = git.stdout?.trim();
  if (hash) return hash;

  return crypto.randomUUID();
}

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute(
  {
    additionalPrecacheEntries: [{ url: "/~offline", revision: precacheRevision() }],
    swSrc: "app/sw.ts",
    useNativeEsbuild: true,
    globIgnores: ["**/downloads/**", "**/*.zip", "**/install-widget.sh"],
  },
);
