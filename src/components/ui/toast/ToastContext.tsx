"use client";

import React, { createContext, useCallback, useContext, useState } from "react";

export type ToastType = "success" | "error" | "warning" | "info";

export type Toast = {
  id: number;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
};

type ToastContextType = {
  toasts: Toast[];
  show: (toast: Omit<Toast, "id">) => number;
  success: (message: string, title?: string) => number;
  error: (message: string, title?: string) => number;
  warning: (message: string, title?: string) => number;
  info: (message: string, title?: string) => number;
  dismiss: (id: number) => void;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

let counter = 0;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (toast: Omit<Toast, "id">) => {
      const id = ++counter;
      const duration = toast.duration ?? 3500;
      setToasts((prev) => [...prev, { ...toast, id }]);
      if (duration > 0) {
        setTimeout(() => dismiss(id), duration);
      }
      return id;
    },
    [dismiss]
  );

  const success = useCallback((message: string, title?: string) => show({ type: "success", message, title }), [show]);
  const error = useCallback((message: string, title?: string) => show({ type: "error", message, title }), [show]);
  const warning = useCallback((message: string, title?: string) => show({ type: "warning", message, title }), [show]);
  const info = useCallback((message: string, title?: string) => show({ type: "info", message, title }), [show]);

  return (
    <ToastContext.Provider value={{ toasts, show, success, error, warning, info, dismiss }}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
};

// ── Viewport ──
const icons: Record<ToastType, React.ReactNode> = {
  success: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  error: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  warning: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>,
  info: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
};

const toneClasses: Record<ToastType, string> = {
  success: "border-emerald-500/30 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
  error: "border-red-500/30 bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400",
  warning: "border-amber-500/30 bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
  info: "border-cyan-500/30 bg-cyan-50 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-400",
};

const ToastViewport: React.FC<{ toasts: Toast[]; onDismiss: (id: number) => void }> = ({ toasts, onDismiss }) => {
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[100000] flex w-full max-w-sm flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={[
            "pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-theme-lg backdrop-blur",
            "animate-[slideIn_0.25s_ease-out]",
            toneClasses[t.type],
          ].join(" ")}
          style={{ animationName: "toastIn" }}
        >
          <span className="mt-0.5 shrink-0">{icons[t.type]}</span>
          <div className="flex-1 min-w-0">
            {t.title && <p className="text-sm font-semibold text-[var(--text-heading)]">{t.title}</p>}
            <p className="text-sm text-[var(--text-body)]">{t.message}</p>
          </div>
          <button
            onClick={() => onDismiss(t.id)}
            className="shrink-0 text-[var(--text-muted)] transition-colors hover:text-[var(--text-body)]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      ))}
    </div>
  );
};
