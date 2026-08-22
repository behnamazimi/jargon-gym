"use client";

import { Button } from "@/components/ui/button";

export function OfflineRetryButton() {
  return <Button onPress={() => window.location.reload()}>Retry</Button>;
}
