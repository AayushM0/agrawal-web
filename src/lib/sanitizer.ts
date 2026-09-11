/**
 * Input Sanitizer for Search, Queries & Fuzzing Defense
 * Strips null bytes, control characters, SQL injection tokens, and length-caps inputs.
 */
export function sanitizeSearchString(input?: string, maxLength = 80): string {
  if (!input || typeof input !== "string") return "";
  return input
    .replace(/[\x00-\x1F\x7F]/g, "") // remove control chars
    .replace(/['";\\]/g, "")         // remove quotes & backslashes
    .replace(/--|\/\*|\*\//g, "")    // remove SQL comment markers
    .trim()
    .slice(0, maxLength);
}

/**
 * Strict Name & Surname Sanitizer:
 * Permits letters, unicode diacritics, spaces, and hyphens up to maxLength (default 40).
 */
export function sanitizeNameString(input?: string, maxLength = 40): string {
  if (!input || typeof input !== "string") return "";
  const cleaned = sanitizeSearchString(input, maxLength);
  // Keep letters (Latin + Devanagari + common international), spaces, and hyphens/apostrophes
  return cleaned.replace(/[^\p{L}\s\-']/gu, "").trim().slice(0, maxLength);
}

/**
 * Biological Age Bound Sanitizer (0 to 120):
 * Enforces strictly bounded non-negative integers. Returns null if invalid.
 */
export function sanitizeAgeBound(input?: any): number | null {
  if (input === undefined || input === null || input === "") return null;
  const num = typeof input === "number" ? input : parseInt(String(input).trim(), 10);
  if (isNaN(num) || !Number.isInteger(num)) return null;
  if (num < 0 || num > 120) return null;
  return num;
}

const VALID_MARITAL_STATUSES = new Set(["all", "unmarried", "single", "married", "widowed", "divorced"]);

/**
 * Whitelist validation for marital status
 */
export function sanitizeMaritalStatus(input?: string): string | null {
  if (!input || typeof input !== "string") return null;
  const clean = input.trim().toLowerCase();
  if (clean === "all" || !VALID_MARITAL_STATUSES.has(clean)) return null;
  return clean;
}

