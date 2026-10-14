import { AppChrome } from "@/components/app-chrome";

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <AppChrome>{children}</AppChrome>;
}
