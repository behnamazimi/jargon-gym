"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { Alert, AlertDescription, type AlertVariant } from "@/components/ui/alert";

type ToastVariant = Extract<AlertVariant, "success" | "destructive">;
type ToastItem = { id: number; message: string; variant: ToastVariant };

type ToastContextValue = {
  toast: (message: string, variant?: ToastVariant) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_DURATION_MS = 3000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const toast = useCallback((message: string, variant: ToastVariant = "success") => {
    const id = nextId.current++;
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, TOAST_DURATION_MS);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="toast toast-bottom toast-center sm:toast-start z-50">
        {toasts.map((t) => (
          <Alert key={t.id} variant={t.variant} className="shadow-lg">
            <AlertDescription>{t.message}</AlertDescription>
          </Alert>
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
