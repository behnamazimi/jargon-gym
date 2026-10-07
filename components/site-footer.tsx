import { BrandIcon } from "@/components/brand-icon";
import { ConsentSettingsButton } from "@/components/consent/consent-settings-button";
import { FooterLink } from "@/components/footer-link";
import { pageContainerClass } from "@/components/page-container";
import { LEGAL_LINKS } from "@/lib/site";
import { cn } from "@/lib/utils";

const SITE_LINKS = [
  { href: "/about", label: "About" },
  { href: "/features", label: "Features" },
  { href: "/how-terms-work", label: "How terms are built" },
  { href: "/collections", label: "Public collections" },
  { href: "/before-you-sign-up", label: "Before you sign up" },
  ...LEGAL_LINKS,
];

export function SiteFooter() {
  return (
    <footer className="border-t border-base-300 bg-base-100">
      <div className={cn(pageContainerClass, "flex flex-col items-center gap-3 py-5")}>
        <nav
          aria-label="Footer"
          className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1"
        >
          {SITE_LINKS.map((link) => (
            <FooterLink key={link.href} href={link.href}>
              {link.label}
            </FooterLink>
          ))}
          <ConsentSettingsButton />
        </nav>
        <p className="m-0 flex items-center justify-center gap-2 text-center text-xs text-base-content/70">
          <BrandIcon size="sm" />
          <span>© Lobyas {new Date().getFullYear()}. A private app, shared by invitation.</span>
        </p>
      </div>
    </footer>
  );
}
