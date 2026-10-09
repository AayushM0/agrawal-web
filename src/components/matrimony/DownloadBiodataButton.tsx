"use client";

import { useRef, useState } from "react";

type DownloadBiodataButtonProps = {
  profileId: string;
  profileName: string;
  variant?: "default" | "outline" | "admin";
  className?: string;
};

const GENERATION_ERROR = "Unable to generate biodata PDF right now. Please try again in a few moments.";

function cleanFilename(name: string) {
  return name.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "") || "Profile";
}

function filenameFromDisposition(header: string | null, fallback: string) {
  if (!header) return fallback;
  const encoded = header.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (encoded) {
    try { return decodeURIComponent(encoded); } catch { return fallback; }
  }
  const match = header.match(/filename\s*=\s*(?:"([^"]+)"|([^;\s]+))/i);
  return match?.[1] || match?.[2] || fallback;
}

export function DownloadBiodataButton({ profileId, profileName, variant = "default", className = "" }: DownloadBiodataButtonProps) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inFlightRef = useRef(false);
  const isCompact = variant === "outline" || variant === "admin";

  const download = async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/matrimony/${encodeURIComponent(profileId)}/biodata/pdf`);
      if (response.status === 401) {
        window.location.assign(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
        return;
      }
      if (!response.ok) throw new Error("PDF_GENERATION_FAILED");

      const fallback = `MAFL_Biodata_${cleanFilename(profileName)}.pdf`;
      const filename = filenameFromDisposition(response.headers.get("Content-Disposition"), fallback);
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError(GENERATION_ERROR);
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  };

  const buttonStyle = variant === "default" ? "va-btn-primary text-white shadow-xs" : "border border-brand-accent/50 bg-white text-brand-primary hover:bg-canvas-warm";
  return (
    <div className={className}>
      <button type="button" disabled={loading} onClick={download} className={`inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${buttonStyle}`}>
        {loading ? <span aria-hidden="true" className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <span aria-hidden="true">⇩</span>}
        <span>{loading ? "Generating Biodata PDF..." : isCompact ? "Download Biodata" : "Download Official Biodata (PDF)"}</span>
      </button>
      {error && <div role="alert" className="mt-2 flex flex-wrap items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs font-medium text-red-700"><span>{error}</span><button type="button" onClick={download} className="font-bold underline underline-offset-2">Retry</button></div>}
    </div>
  );
}
