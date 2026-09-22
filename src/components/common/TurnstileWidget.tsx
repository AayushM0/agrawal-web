'use client';

import React, { useEffect, useRef, useState } from 'react';

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

export function TurnstileWidget({
  siteKey,
  onVerify,
  onExpire,
  onError,
  theme = 'auto',
  size = 'flexible',
  className = '',
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [isDevFallback, setIsDevFallback] = useState(false);
  const [loadStatus, setLoadStatus] = useState<'loading' | 'ready' | 'verified' | 'error'>('loading');

  const rawSiteKey = siteKey || process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY;
  const effectiveSiteKey = rawSiteKey ? rawSiteKey.replace(/["']/g, '').trim() : undefined;

  const onVerifyRef = useRef(onVerify);
  onVerifyRef.current = onVerify;
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    // 1. If no site key is available, activate dev bypass
    if (!effectiveSiteKey) {
      setIsDevFallback(true);
      setLoadStatus('verified');
      const timer = setTimeout(() => {
        onVerifyRef.current('dev-bypass-token');
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
            setLoadStatus('verified');
            onVerifyRef.current(token);
          },
          'expired-callback': () => {
            setLoadStatus('ready');
            onExpireRef.current?.();
          },
          'error-callback': (errorCode: string) => {
            console.error('[TURNSTILE ERROR CODE]', errorCode);
            setLoadStatus('error');
            onErrorRef.current?.(errorCode);
          },
          theme,
          size,
        });
        setLoadStatus('ready');
      } catch (err) {
        console.error('[TURNSTILE RENDER ERROR]', err);
        if (process.env.NODE_ENV !== 'production') {
          setLoadStatus('verified');
          onVerifyRef.current('dev-bypass-token');
        } else {
          setLoadStatus('error');
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
      script.onerror = () => {
        setLoadStatus('error');
        onErrorRef.current?.('Turnstile script failed to load');
      };
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

    // 3. Fallback timeout check (6s) if script blocked by ad-blocker or network
    const timeoutCheck = setTimeout(() => {
      if (!window.turnstile && !widgetIdRef.current && process.env.NODE_ENV === 'production') {
        setLoadStatus('error');
      }
    }, 6000);

    return () => {
      clearTimeout(timeoutCheck);
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // Ignore unmount cleanup errors
        }
        widgetIdRef.current = null;
      }
    };
  }, [effectiveSiteKey, theme, size]);

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
      className={`min-h-[65px] flex flex-col items-center justify-center ${className}`}
    >
      {loadStatus === 'loading' && (
        <div className="flex items-center gap-2 text-xs text-body-muted py-2 animate-pulse">
          <span className="w-2 h-2 rounded-full bg-brand-primary" />
          <span>Connecting security verification...</span>
        </div>
      )}

      {loadStatus === 'error' && (
        <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-red-50 border border-red-200 text-center max-w-sm my-1">
          <span className="text-xs font-semibold text-red-700">Security check could not load</span>
          <span className="text-[11px] text-body-muted">If you have an ad-blocker or private DNS enabled, please disable it for this site and retry.</span>
          <button
            type="button"
            onClick={() => {
              setLoadStatus('loading');
              if (window.turnstile && containerRef.current) {
                try {
                  if (widgetIdRef.current) window.turnstile.remove(widgetIdRef.current);
                } catch {}
                widgetIdRef.current = null;
                try {
                  widgetIdRef.current = window.turnstile.render(containerRef.current, {
                    sitekey: effectiveSiteKey || '',
                    callback: (token: string) => {
                      setLoadStatus('verified');
                      onVerifyRef.current(token);
                    },
                    'expired-callback': () => {
                      setLoadStatus('ready');
                      onExpireRef.current?.();
                    },
                    'error-callback': (errorCode: string) => {
                      console.error('[TURNSTILE RETRY ERROR]', errorCode);
                      setLoadStatus('error');
                      onErrorRef.current?.(errorCode);
                    },
                    theme,
                    size,
                  });
                  setLoadStatus('ready');
                } catch (e) {
                  console.error('[TURNSTILE RETRY EXCEPTION]', e);
                  setLoadStatus('error');
                }
              }
            }}
            className="mt-1 px-3 py-1 bg-white border border-red-300 rounded-lg text-xs font-bold text-red-700 hover:bg-red-50 transition-all shadow-xs"
          >
            ↻ Retry Verification
          </button>
        </div>
      )}

      <div ref={containerRef} />
    </div>
  );
}
