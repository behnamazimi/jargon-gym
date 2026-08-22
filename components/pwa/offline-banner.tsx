"use client";

import { WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { pageContainerClass } from "@/components/page-container";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

export function OfflineBanner() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (online) return null;

  return (
    <div className={cn(pageContainerClass, "pt-4")}>
      <Alert>
        <WifiOff className="size-4" aria-hidden />
        <AlertTitle>You&apos;re offline</AlertTitle>
        <AlertDescription>Quizzes and your collection need a connection.</AlertDescription>
      </Alert>
    </div>
  );
}
