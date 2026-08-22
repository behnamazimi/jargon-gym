import { WifiOff } from "lucide-react";
import { OfflineRetryButton } from "@/components/pwa/offline-retry-button";
import { StatusPage } from "@/components/status-page";

export default function OfflinePage() {
  return (
    <StatusPage
      icon={WifiOff}
      title="You're offline"
      description="Cached pages still load. Connect to the internet to open quizzes and your collection."
    >
      <OfflineRetryButton />
    </StatusPage>
  );
}
