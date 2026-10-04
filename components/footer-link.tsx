import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const footerLinkClass =
  "text-xs text-base-content/70 underline underline-offset-2 transition-colors hover:text-base-content";

export function FooterLink({ className, href, ...props }: ComponentProps<typeof Link>) {
  return <Link href={href} className={cn(footerLinkClass, className)} {...props} />;
}
