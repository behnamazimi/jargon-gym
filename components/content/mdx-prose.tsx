import type { MDXComponents } from "mdx/types";
import Link from "next/link";
import type { ComponentProps } from "react";
import { contentPageLinkClass } from "@/components/content/content-page-shell";
import { SectionHeading } from "@/components/public/section-heading";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/site";

function ProseLink({ href = "", children }: ComponentProps<"a">) {
  if (href.startsWith("/")) {
    return (
      <Link href={href} className={contentPageLinkClass}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} className={contentPageLinkClass}>
      {children}
    </a>
  );
}

function SupportEmail() {
  return (
    <a href={SUPPORT_MAILTO} className={contentPageLinkClass}>
      {SUPPORT_EMAIL}
    </a>
  );
}

export const baseProse: MDXComponents = {
  a: ProseLink,
  strong: ({ children }) => <strong className="font-medium text-base-content">{children}</strong>,
  SupportEmail,
};

/** Long-form pages that sell the app: larger type, Fraunces section headings. */
export const showcaseProse: MDXComponents = {
  ...baseProse,
  h2: ({ children }) => <SectionHeading className="mt-14 first:mt-0">{children}</SectionHeading>,
  p: ({ children }) => (
    <p className="m-0 mt-4 text-base leading-relaxed text-base-content/85">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="m-0 mt-4 list-disc space-y-2 ps-5 text-base leading-relaxed text-base-content/85">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="m-0 mt-4 list-decimal space-y-2 ps-5 text-base leading-relaxed text-base-content/85">
      {children}
    </ol>
  ),
};

/** Privacy and Terms: small, plain type. */
export const legalProse: MDXComponents = {
  ...baseProse,
  h2: ({ children }) => (
    <h2 className="m-0 mt-10 text-lg font-medium text-base-content first:mt-0">{children}</h2>
  ),
  p: ({ children }) => <p className="m-0 mt-4 text-sm text-base-content/80">{children}</p>,
  ul: ({ children }) => (
    <ul className="m-0 mt-4 list-disc space-y-2 ps-5 text-sm text-base-content/70">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="m-0 mt-4 list-decimal space-y-2 ps-5 text-sm text-base-content/70">
      {children}
    </ol>
  ),
};
