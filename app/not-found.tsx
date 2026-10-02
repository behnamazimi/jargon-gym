import { FileQuestion } from "lucide-react";
import { StatusPage } from "@/components/status-page";
import { LinkButton } from "@/components/ui/button";
import { AUTHENTICATED_HOME_PATH } from "@/lib/auth/safe-next-path";
import { hasLikelySession } from "@/lib/auth/require-session";

export default async function NotFound() {
  const homeHref = (await hasLikelySession()) ? AUTHENTICATED_HOME_PATH : "/";

  return (
    <StatusPage
      icon={FileQuestion}
      title="Page not found"
      description="The page you're looking for doesn't exist or may have moved."
    >
      <LinkButton href={homeHref}>Back to home</LinkButton>
    </StatusPage>
  );
}
