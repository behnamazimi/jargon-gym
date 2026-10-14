import { StaticChrome } from "@/components/static-chrome";

export default function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <StaticChrome>{children}</StaticChrome>;
}
