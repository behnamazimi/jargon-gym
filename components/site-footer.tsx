import { pageContainerClass } from "@/components/page-container";
import { cn } from "@/lib/utils";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className={cn(pageContainerClass, "py-5")}>
        <p className="m-0 text-center text-[12px] leading-relaxed text-muted-foreground">
          Jargon Gym — a personal jargon review helper. For personal use only.
        </p>
      </div>
    </footer>
  );
}
