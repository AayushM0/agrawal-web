'use client';

import React, { useEffect, useState, useRef } from "react";

export interface MessageRequestToastData {
  id: string;
  senderName: string;
  senderGotra?: string | null;
  messagePreview: string;
  conversationId: string;
}

interface MessageRequestToastProps {
  toast: MessageRequestToastData | null;
  onClose: () => void;
  onOpenChat: (conversationId: string) => void;
  autoDismissMs?: number;
}

export function MessageRequestToast({
  toast,
  onClose,
  onOpenChat,
  autoDismissMs = 8000,
}: MessageRequestToastProps) {
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(100);
  const remainingTimeRef = useRef(autoDismissMs);
  const lastTickRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!toast) return;

    remainingTimeRef.current = autoDismissMs;
    setProgress(100);
    lastTickRef.current = Date.now();

    const interval = setInterval(() => {
      if (isPaused) {
        lastTickRef.current = Date.now();
        return;
      }

      const now = Date.now();
      const elapsed = now - lastTickRef.current;
      lastTickRef.current = now;

      remainingTimeRef.current -= elapsed;
      const pct = Math.max(0, (remainingTimeRef.current / autoDismissMs) * 100);
      setProgress(pct);

      if (remainingTimeRef.current <= 0) {
        clearInterval(interval);
        onClose();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [toast?.id, isPaused, autoDismissMs, onClose]);

  if (!toast) return null;

  return (
    <aside
      aria-label="New message request notification"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="fixed top-20 right-4 sm:right-6 z-50 max-w-sm sm:max-w-md w-full bg-white border-2 border-brand-accent/40 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-top-4"
    >
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-canvas-warm border border-brand-accent/30 text-base">
              💬
            </span>
            <div>
              <span className="inline-block px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-canvas-warm text-brand-primary rounded-full border border-brand-accent/30">
                New Message Request
              </span>
              <h4 className="text-sm font-bold text-body-heading mt-0.5">
                {toast.senderName}
                {toast.senderGotra && (
                  <span className="text-xs font-normal text-body-muted ml-1.5">
                    ({toast.senderGotra})
                  </span>
                )}
              </h4>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Dismiss notification"
            className="text-body-muted hover:text-body-heading p-1 rounded-lg transition"
          >
            ✕
          </button>
        </div>

        <p className="mt-2.5 text-xs text-body-text line-clamp-2 italic bg-canvas-warm/50 border-l-2 border-brand-primary p-2 rounded-r-lg">
          &ldquo;{toast.messagePreview}&rdquo;
        </p>

        <div className="mt-3.5 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-body-muted hover:text-body-heading hover:bg-canvas-warm transition"
          >
            Dismiss
          </button>
          <button
            onClick={() => {
              onOpenChat(toast.conversationId);
              onClose();
            }}
            className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-brand-primary hover:bg-brand-primary-hover shadow-sm transition flex items-center gap-1.5"
          >
            <span>Open Chat</span>
            <span>&rarr;</span>
          </button>
        </div>
      </div>

      {/* Auto-dismiss progress bar */}
      <div className="h-1 w-full bg-canvas-warm">
        <div
          className="h-full bg-brand-primary transition-all duration-75"
          style={{ width: `${progress}%` }}
        />
      </div>
    </aside>
  );
}
