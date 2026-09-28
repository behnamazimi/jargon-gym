"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Alert, AlertAction, AlertDescription, type AlertVariant } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ToastVariant = Extract<AlertVariant, "success" | "destructive">;

type ToastAction = { label: string; onPress: () => void };

type ToastOptions = { action?: ToastAction };

type ToastItem = {
  id: number;
  message: string;
  variant: ToastVariant;
  action?: ToastAction;
};

type ToastContextValue = {
  /** Returns the toast's id, for `dismiss`. */
  toast: (message: string, variant?: ToastVariant, options?: ToastOptions) => number;
  dismiss: (id: number) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_DURATION_MS = 3000;
// Long enough to read the message and reach the button.
const ACTION_TOAST_DURATION_MS = 6000;
const MAX_TOASTS = 3;

function ToastView({ item, onDismiss }: { item: ToastItem; onDismiss: (id: number) => void }) {
  const [paused, setPaused] = useState(false);
  const duration = item.action ? ACTION_TOAST_DURATION_MS : TOAST_DURATION_MS;

  useEffect(() => {
    if (paused) return;
    const timeout = setTimeout(() => onDismiss(item.id), duration);
    return () => clearTimeout(timeout);
  }, [paused, item.id, duration, onDismiss]);

  return (
    <Alert
      variant={item.variant}
      // Horizontal on every width so an action sits beside the message, not under it.
      className={cn("alert-horizontal gap-3 px-4 py-2.5 shadow-lg", item.action && "py-1.5 pe-2")}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <AlertDescription>{item.message}</AlertDescription>
      {item.action ? (
        <AlertAction>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="font-semibold underline underline-offset-2"
            onPress={() => {
              onDismiss(item.id);
              item.action?.onPress();
            }}
          >
            {item.action.label}
          </Button>
        </AlertAction>
      ) : null}
    </Alert>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, variant: ToastVariant = "success", options?: ToastOptions) => {
      const id = nextId.current++;
      setToasts((prev) =>
        [...prev, { id, message, variant, action: options?.action }].slice(-MAX_TOASTS),
      );
      return id;
    },
    [],
  );

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      {/* Phone: below the top bar, clear of the dock and study controls.
          Above focus mode's z-[100] overlay. */}
      <div className="toast toast-top toast-center z-[110] max-md:top-[calc(env(safe-area-inset-top,0px)+2.75rem)] md:toast-bottom md:toast-start">
        {toasts.map((t) => (
          <ToastView key={t.id} item={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
