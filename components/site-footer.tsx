import { BrandIcon } from "@/components/brand-icon";
import { pageContainerClass } from "@/components/page-container";
import { cn } from "@/lib/utils";

export function SiteFooter() {
  return (
    <footer className="border-t border-base-300 bg-base-100">
      <div className={cn(pageContainerClass, "py-5")}>
        <p className="m-0 flex items-center justify-center gap-1.5 text-center text-xs leading-relaxed text-base-content/60">
          <BrandIcon size="sm" />
          <span>Jargon Gym — private app, shared by invitation.</span>
        </p>
      </div>
    </footer>
  );
}
