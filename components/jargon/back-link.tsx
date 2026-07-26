import { ArrowLeft } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const JARGON_HOME_PATH = "/jargon";
export const JARGON_HOME_BACK_LABEL = "Back to collection";
export const PUBLIC_HOME_PATH = "/";
export const PUBLIC_HOME_BACK_LABEL = "Back to home";

type BackLinkProps = {
  href?: string;
  label?: string;
  variant?: "ghost" | "outline";
  className?: string;
};

export function BackLink({
  href = JARGON_HOME_PATH,
  label = JARGON_HOME_BACK_LABEL,
  variant = "ghost",
  className,
}: BackLinkProps) {
  return (
    <LinkButton
      href={href}
      variant={variant}
      size="sm"
      className={cn("shrink-0 text-muted-foreground hover:text-foreground", className)}
    >
      <ArrowLeft className="size-3.5" aria-hidden />
      {label}
    </LinkButton>
  );
}
