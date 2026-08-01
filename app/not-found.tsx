import { FileQuestion } from "lucide-react";
import { StatusPage } from "@/components/status-page";
import { LinkButton } from "@/components/ui/button";

export default function NotFound() {
  return (
    <StatusPage
      icon={FileQuestion}
      title="Page not found"
      description="The page you're looking for doesn't exist or may have moved."
    >
      <LinkButton href="/">Back to home</LinkButton>
    </StatusPage>
  );
}
