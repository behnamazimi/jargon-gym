"use client";

import { WifiOff } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { pageContainerClass } from "@/components/page-container";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { isStudyPath } from "@/lib/chrome";
import { cn } from "@/lib/utils";

export function OfflineBanner() {
  const pathname = usePathname();
  const [online, setOnline] = useState(true);
  const compact = isStudyPath(pathname);

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

  if (compact) {
    return (
      <div
        role="status"
        className="flex items-center gap-2 border-b border-warning/30 bg-warning/15 px-4 py-2 text-sm text-base-content md:px-5"
      >
        <WifiOff className="size-4 shrink-0" aria-hidden />
        <span>You&apos;re offline. Quizzes and your collection need a connection.</span>
      </div>
    );
  }

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
