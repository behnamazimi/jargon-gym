import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type SectionHeadingProps = {
  children: ReactNode;
  id?: string;
  count?: number;
  ruled?: boolean;
  className?: string;
};

export function SectionHeading({
  children,
  id,
  count,
  ruled = false,
  className,
}: SectionHeadingProps) {
  return (
    <h2
      id={id}
      className={cn(
        "m-0 flex scroll-mt-24 items-baseline justify-between gap-4 text-balance text-2xl font-medium tracking-tight sm:text-3xl",
        ruled && "border-t-2 border-base-content/80 pt-4",
        className,
      )}
    >
      <span>{children}</span>
      {count === undefined ? null : (
        <span className="shrink-0 font-sans text-sm font-normal tabular-nums text-base-content/60">
          {count}
        </span>
      )}
    </h2>
  );
}
