import { PanelSkeleton } from "@/components/page-skeleton";

export default function SettingsLoading() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <PanelSkeleton />
      <PanelSkeleton />
      <PanelSkeleton />
    </div>
  );
}
