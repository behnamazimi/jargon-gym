import { pageContainerClass } from "@/components/page-container";
import { cn } from "@/lib/utils";

export function SiteFooter() {
  return (
    <footer className="border-t border-base-300 bg-base-100">
      <div className={cn(pageContainerClass, "py-5")}>
        <p className="m-0 text-center text-[12px] leading-relaxed text-base-content/60">
          Jargon Gym — a personal jargon review helper. For personal use only.
        </p>
      </div>
    </footer>
  );
}
