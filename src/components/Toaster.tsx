"use client";

import { X } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

export type ToastInput = {
  message: string;
  tone?: "info" | "error";
  // 「元に戻す」などの操作。押すとトーストは閉じる
  action?: { label: string; onClick: () => void };
  durationMs?: number;
};
type Toast = ToastInput & { id: number };

type ToastApi = { toast: (t: ToastInput) => number; dismiss: (id: number) => void };

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast は ToastProvider の内側で使う");
  return ctx;
}

// 画面下部のトースト。楽観的更新の失敗通知と「元に戻す」に使う。
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((ts) => ts.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (t: ToastInput) => {
      const id = ++seq.current;
      setToasts((ts) => [...ts, { ...t, id }]);
      setTimeout(() => dismiss(id), t.durationMs ?? 5000);
      return id;
    },
    [dismiss],
  );

  const api = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6">
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.tone === "error" ? "alert" : "status"}
            className={`pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-xl px-4 py-3 text-sm text-white shadow-lg ${
              t.tone === "error" ? "bg-red-600" : "bg-gray-900"
            }`}
          >
            <span className="min-w-0 flex-1">{t.message}</span>
            {t.action && (
              <button
                type="button"
                onClick={() => {
                  t.action?.onClick();
                  dismiss(t.id);
                }}
                className="shrink-0 font-semibold text-blue-300 hover:text-blue-200"
              >
                {t.action.label}
              </button>
            )}
            <button
              type="button"
              aria-label="閉じる"
              onClick={() => dismiss(t.id)}
              className="shrink-0 text-white/60 hover:text-white"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
