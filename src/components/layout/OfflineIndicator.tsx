'use client';

import React, { useState, useEffect } from "react";

export default function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsOffline(!window.navigator.onLine);

      const handleOnline = () => setIsOffline(false);
      const handleOffline = () => setIsOffline(true);

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, []);

  if (!isOffline) return null;

  return (
    <div
      role="alert"
      className="bg-red-650 text-white px-4 py-2 text-center text-xs font-bold w-full select-none shadow-md z-[100] animate-in slide-in-from-top-4 duration-200"
    >
      <div className="flex items-center justify-center gap-2">
        <span className="text-sm">⚠️</span>
        <span>You are currently offline. Please check your internet connection. Some features may be unavailable.</span>
      </div>
    </div>
  );
}
