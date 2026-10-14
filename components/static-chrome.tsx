import { OfflineBanner } from "@/components/pwa/offline-banner";
import { SiteFooter } from "@/components/site-footer";
import { VisitorHeader } from "@/components/visitor-header";

/** The page frame for pages cached without a session. It reads no cookies, so
 *  the header learns who is signed in in the browser (VisitorHeader). */
export function StaticChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col" data-chrome="site">
      <VisitorHeader initialIsDark={false} />
      <OfflineBanner />
      <main className="flex min-h-0 flex-1 flex-col">{children}</main>
      <SiteFooter />
    </div>
  );
}
