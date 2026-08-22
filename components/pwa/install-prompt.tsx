"use client";

import { Download } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PWA_INSTALL_DISMISS_KEY, PWA_NAME } from "@/lib/pwa";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type InstallContextValue = {
  canInstall: boolean;
  isIos: boolean;
  isStandalone: boolean;
  promptInstall: () => Promise<void>;
  openIosDialog: () => void;
};

const InstallContext = createContext<InstallContextValue | null>(null);

function isStandaloneDisplay() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator &&
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

function isIosDevice() {
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua) && !("MSStream" in window);
  const iPadOs = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return iOS || iPadOs;
}

export function PwaInstallProvider({ children }: { children: ReactNode }) {
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [toastDismissed, setToastDismissed] = useState(true);
  const [iosDialogOpen, setIosDialogOpen] = useState(false);

  useEffect(() => {
    setIsStandalone(isStandaloneDisplay());
    setIsIos(isIosDevice());
    setToastDismissed(window.localStorage.getItem(PWA_INSTALL_DISMISS_KEY) === "1");

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
    };
    const onDisplayModeChange = (event: MediaQueryListEvent) => {
      setIsStandalone(event.matches || isStandaloneDisplay());
    };

    const displayMode = window.matchMedia("(display-mode: standalone)");
    displayMode.addEventListener("change", onDisplayModeChange);
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      displayMode.removeEventListener("change", onDisplayModeChange);
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const dismissToast = useCallback(() => {
    setToastDismissed(true);
    window.localStorage.setItem(PWA_INSTALL_DISMISS_KEY, "1");
  }, []);

  const openIosDialog = useCallback(() => {
    setIosDialogOpen(true);
  }, []);

  const value = useMemo<InstallContextValue>(
    () => ({
      canInstall: Boolean(deferredPrompt),
      isIos,
      isStandalone,
      promptInstall,
      openIosDialog,
    }),
    [deferredPrompt, isIos, isStandalone, promptInstall, openIosDialog],
  );

  const showToast = Boolean(deferredPrompt) && !toastDismissed && !isStandalone;

  return (
    <InstallContext.Provider value={value}>
      {children}
      {showToast ? (
        <div className="toast toast-end toast-bottom z-50">
          <div role="status" className="alert sm:alert-horizontal">
            <span>Install {PWA_NAME} for quicker access.</span>
            <div className="flex gap-2">
              <Button size="sm" onPress={() => void promptInstall()}>
                Install
              </Button>
              <Button size="sm" variant="ghost" onPress={dismissToast}>
                Not now
              </Button>
            </div>
          </div>
        </div>
      ) : null}
      <Dialog isOpen={iosDialogOpen} onOpenChange={setIosDialogOpen}>
        <DialogHeader>
          <DialogTitle>Install {PWA_NAME}</DialogTitle>
          <DialogDescription>
            On iPhone or iPad, add the app from Safari. Tap <kbd className="kbd kbd-sm">Share</kbd>{" "}
            in the toolbar, then <kbd className="kbd kbd-sm">Add to Home Screen</kbd>.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter showCloseButton />
      </Dialog>
    </InstallContext.Provider>
  );
}

export function InstallButton() {
  const ctx = useContext(InstallContext);
  if (!ctx || ctx.isStandalone || (!ctx.canInstall && !ctx.isIos)) return null;

  return (
    <Button
      variant="ghost"
      aria-label={`Install ${PWA_NAME}`}
      onPress={() => {
        if (ctx.canInstall) {
          void ctx.promptInstall();
          return;
        }
        ctx.openIosDialog();
      }}
    >
      <Download className="h-4 w-4" strokeWidth={1.5} />
      <span className="hidden sm:inline">Install</span>
    </Button>
  );
}
