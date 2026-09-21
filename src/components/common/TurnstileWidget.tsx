'use client';

import React, { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement | string,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: (errorCode: string) => void;
          theme?: 'light' | 'dark' | 'auto';
          size?: 'normal' | 'flexible' | 'compact';
        }
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
    onloadTurnstileCallback?: () => void;
  }
}

export interface TurnstileRef {
  reset: () => void;
}

export interface TurnstileWidgetProps {
  siteKey?: string;
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: (error: string) => void;
  theme?: 'light' | 'dark' | 'auto';
  size?: 'normal' | 'flexible' | 'compact';
  className?: string;
}

const SCRIPT_ID = 'cf-turnstile-script';

export const TurnstileWidget = forwardRef<TurnstileRef, TurnstileWidgetProps>(
  (
    {
      siteKey,
      onVerify,
      onExpire,
      onError,
      theme = 'auto',
      size = 'flexible',
      className = '',
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const widgetIdRef = useRef<string | null>(null);
    const [isDevFallback, setIsDevFallback] = useState(false);

    const effectiveSiteKey =
      siteKey || process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY;

    useImperativeHandle(ref, () => ({
      reset: () => {
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.reset(widgetIdRef.current);
        } else if (isDevFallback) {
          onVerify('dev-bypass-token');
        }
      },
    }));

    useEffect(() => {
      // 1. If no site key is available, activate dev bypass
      if (!effectiveSiteKey) {
        setIsDevFallback(true);
        const timer = setTimeout(() => {
          onVerify('dev-bypass-token');
        }, 100);
        return () => clearTimeout(timer);
      }

      setIsDevFallback(false);

      const renderWidget = () => {
        if (!containerRef.current || !window.turnstile || widgetIdRef.current) {
          return;
        }

        try {
          widgetIdRef.current = window.turnstile.render(containerRef.current, {
            sitekey: effectiveSiteKey,
            callback: (token: string) => {
              onVerify(token);
            },
            'expired-callback': () => {
              onExpire?.();
            },
            'error-callback': (errorCode: string) => {
              onError?.(errorCode);
            },
            theme,
            size,
          });
        } catch {
          // If explicit render throws, fallback to dev token in non-production
          if (process.env.NODE_ENV !== 'production') {
            onVerify('dev-bypass-token');
          }
        }
      };

      // 2. Load script if not already present
      if (!document.getElementById(SCRIPT_ID)) {
        window.onloadTurnstileCallback = () => {
          renderWidget();
        };

        const script = document.createElement('script');
        script.id = SCRIPT_ID;
        script.src =
          'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onloadTurnstileCallback&render=explicit';
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      } else if (window.turnstile) {
        renderWidget();
      } else {
        const prevCallback = window.onloadTurnstileCallback;
        window.onloadTurnstileCallback = () => {
          if (prevCallback) prevCallback();
          renderWidget();
        };
      }

      return () => {
        if (widgetIdRef.current && window.turnstile) {
          try {
            window.turnstile.remove(widgetIdRef.current);
          } catch {
            // Ignore unmount cleanup errors
          }
          widgetIdRef.current = null;
        }
      };
    }, [effectiveSiteKey, theme, size, onVerify, onExpire, onError]);

    if (isDevFallback) {
      return (
        <div
          className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-200 text-xs shadow-inner ${className}`}
        >
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono font-medium">Turnstile Bot Shield (Dev Mode)</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold uppercase tracking-wider">
            Auto-Verified
          </span>
        </div>
      );
    }

    return (
      <div
        className={`min-h-[65px] flex items-center justify-center ${className}`}
      >
        <div ref={containerRef} />
      </div>
    );
  }
);

TurnstileWidget.displayName = 'TurnstileWidget';
