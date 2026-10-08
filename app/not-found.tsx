import type { Metadata } from "next";
import { FileQuestion } from "lucide-react";
import { NotFoundScene } from "@/components/illustrations/scenes/not-found";
import { StatusPage } from "@/components/status-page";
import { LinkButton } from "@/components/ui/button";
import { AUTHENTICATED_HOME_PATH } from "@/lib/auth/safe-next-path";
import { hasLikelySession } from "@/lib/auth/require-session";

export const metadata: Metadata = { title: "Page not found" };

export default async function NotFound() {
  const homeHref = (await hasLikelySession()) ? AUTHENTICATED_HOME_PATH : "/";

  return (
    <StatusPage
      icon={FileQuestion}
      illustration={<NotFoundScene className="w-72 sm:w-96" />}
      title="Page not found"
      description="The page you're looking for doesn't exist or may have moved."
    >
      <LinkButton href={homeHref}>Back to home</LinkButton>
    </StatusPage>
  );
}
