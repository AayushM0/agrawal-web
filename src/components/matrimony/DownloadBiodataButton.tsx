"use client";

import { useState } from "react";

export function DownloadBiodataButton({ profileId, profileName, variant = "primary" }: { profileId: string; profileName: string; variant?: "primary" | "secondary" }) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const download = async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/matrimony/${encodeURIComponent(profileId)}/biodata/pdf`);
      if (!response.ok) throw new Error("Biodata PDF could not be generated. Please try again.");
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url; link.download = `MAFL_Biodata_${profileName.replace(/[^a-z0-9]+/gi, "_") || "Profile"}.pdf`;
      document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Biodata PDF could not be generated."); }
    finally { setLoading(false); }
  };
  return <div><button type="button" disabled={loading} onClick={download} className={variant === "primary" ? "btn-primary" : "btn-secondary"}>{loading ? "Generating Biodata PDF..." : "Download Biodata PDF"}</button>{error && <p role="alert">{error}</p>}</div>;
}
