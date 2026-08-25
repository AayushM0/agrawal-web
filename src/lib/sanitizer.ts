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
