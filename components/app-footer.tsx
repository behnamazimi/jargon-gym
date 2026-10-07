import { ConsentSettingsButton } from "@/components/consent/consent-settings-button";
import { FooterLink } from "@/components/footer-link";
import { pageContainerClass } from "@/components/page-container";
import { LEGAL_LINKS } from "@/lib/site";
import { cn } from "@/lib/utils";

export function AppFooter() {
  return (
    <footer className="border-t border-base-300 bg-base-100">
      <div
        className={cn(
          pageContainerClass,
          "flex flex-wrap items-center justify-center gap-x-4 gap-y-1 py-3",
        )}
      >
        <nav aria-label="Footer" className="flex items-center gap-x-4">
          {LEGAL_LINKS.map((link) => (
            <FooterLink key={link.href} href={link.href}>
              {link.label}
            </FooterLink>
          ))}
          <ConsentSettingsButton />
        </nav>
        <span className="text-xs text-base-content/70">© Lobyas {new Date().getFullYear()}</span>
      </div>
    </footer>
  );
}
