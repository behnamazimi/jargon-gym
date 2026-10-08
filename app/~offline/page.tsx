import type { Metadata } from "next";
import { WifiOff } from "lucide-react";
import { OfflineRetryButton } from "@/components/pwa/offline-retry-button";
import { OfflineScene } from "@/components/illustrations/scenes/offline";
import { StatusPage } from "@/components/status-page";

export const metadata: Metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <StatusPage
      icon={WifiOff}
      illustration={<OfflineScene className="w-72 sm:w-96" />}
      title="You're offline"
      description="Cached pages still load. Connect to the internet to open quizzes and your library."
    >
      <OfflineRetryButton />
    </StatusPage>
  );
}
