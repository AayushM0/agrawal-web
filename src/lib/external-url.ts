import type { BusinessSocialLinks } from "@/types/business";

export function isSafeExternalUrl(value?: string): boolean {
  if (!value) return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export function sanitizeSocialLinks(links?: BusinessSocialLinks): BusinessSocialLinks {
  if (!links) return {};
  return Object.fromEntries(
    Object.entries(links).filter(([, value]) => typeof value === "string" && isSafeExternalUrl(value))
  ) as BusinessSocialLinks;
}
