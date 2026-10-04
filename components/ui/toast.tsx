"use client";

import { createContext, useContext, useMemo, type CSSProperties, type ReactNode } from "react";
import { Toaster, toast as sonnerToast } from "sonner";

type ToastVariant = "success" | "destructive";

type ToastAction = { label: string; onPress: () => void };

type ToastOptions = { action?: ToastAction };

type ToastId = string | number;

type ToastContextValue = {
  /** Returns the toast's id, for `dismiss`. */
  toast: (message: string, variant?: ToastVariant, options?: ToastOptions) => ToastId;
  dismiss: (id: ToastId) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_DURATION_MS = 3000;
// Long enough to read the message and reach the button.
const ACTION_TOAST_DURATION_MS = 6000;
const MAX_TOASTS = 3;

const toasterStyle = {
  "--normal-bg": "var(--color-base-100)",
  "--normal-text": "var(--color-base-content)",
  "--normal-border": "var(--color-base-300)",
  "--border-radius": "var(--radius-box)",
} as CSSProperties;

function show(message: string, variant: ToastVariant, options?: ToastOptions): ToastId {
  const action = options?.action;
  const common = {
    duration: action ? ACTION_TOAST_DURATION_MS : TOAST_DURATION_MS,
    action: action && { label: action.label, onClick: action.onPress },
  };
  return variant === "destructive"
    ? sonnerToast.error(message, common)
    : sonnerToast.success(message, common);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const value = useMemo<ToastContextValue>(
    () => ({
      toast: (message, variant = "success", options) => show(message, variant, options),
      dismiss: (id) => {
        sonnerToast.dismiss(id);
      },
    }),
    [],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Bottom center, above the phone dock when there is one. Above focus mode's z-[100] overlay. */}
      <Toaster
        position="bottom-center"
        visibleToasts={MAX_TOASTS}
        offset={{ bottom: "1rem" }}
        mobileOffset={{
          bottom: "calc(var(--dock-bottom, var(--safe-bottom)) + 0.75rem)",
        }}
        style={{ ...toasterStyle, zIndex: 110 }}
        toastOptions={{
          classNames: {
            toast: "!px-4 !py-3 !text-sm !shadow-md",
            icon: "!mx-0 !me-3 !size-8 !justify-center rounded-full !bg-base-200",
            success: "[&_[data-icon]]:!bg-success/20 [&_[data-icon]]:!text-success-text",
            error: "[&_[data-icon]]:!bg-error/20 [&_[data-icon]]:!text-error-text",
            actionButton:
              "!bg-transparent !text-base-content !font-semibold !underline !underline-offset-2",
          },
        }}
      />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
