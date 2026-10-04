import type { MDXComponents } from "mdx/types";
import { baseProse } from "@/components/content/mdx-prose";

// Pages pass showcaseProse or legalProse; this is only the fallback.
export function useMDXComponents(): MDXComponents {
  return baseProse;
}
