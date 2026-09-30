/**
 * Shared Email Validation, Normalization & Typo Prevention Engine
 *
 * Implements Issue 051: Registration Email Input Hardening and Mistake Prevention.
 * Single source of truth for email format, safety, canonical comparison, and
 * non-silent domain typo suggestions across client forms and server actions.
 */

export interface EmailValidationResult {
  isValid: boolean;
  error?: string;
  canonical?: string;
  localPart?: string;
  domain?: string;
  asciiDomain?: string;
  suggestion?: string;
}

const POPULAR_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "yahoo.co.in",
  "outlook.com",
  "hotmail.com",
  "icloud.com",
  "rediffmail.com",
] as const;

/**
 * Common typo misspellings for popular consumer mail domains.
 * Maps exact typo -> intended canonical domain.
 */
const KNOWN_DOMAIN_TYPOS: Record<string, string> = {
  // Gmail typos
  "gmial.com": "gmail.com",
  "gamil.com": "gmail.com",
  "gmaill.com": "gmail.com",
  "gmai.com": "gmail.com",
  "gmal.com": "gmail.com",
  "gmaik.com": "gmail.com",
  "gmeil.com": "gmail.com",
  "gmail.con": "gmail.com",
  "gmail.co": "gmail.com",
  "gmail.cm": "gmail.com",
  "gmail.cpm": "gmail.com",
  "gmail.comm": "gmail.com",
  "gmaill.co": "gmail.com",
  "gamil.co": "gmail.com",
  "gimail.com": "gmail.com",
  "gmaiil.com": "gmail.com",

  // Yahoo typos
  "yaho.com": "yahoo.com",
  "yahooo.com": "yahoo.com",
  "yhoo.com": "yahoo.com",
  "yaaho.com": "yahoo.com",
  "yahoo.con": "yahoo.com",
  "yahoo.co": "yahoo.com",
  "yahoo.cm": "yahoo.com",
  "yahoo.co.i": "yahoo.co.in",
  "yahoo.coin": "yahoo.co.in",
  "yaho.co.in": "yahoo.co.in",

  // Outlook typos
  "outlok.com": "outlook.com",
  "outllok.com": "outlook.com",
  "outloo.com": "outlook.com",
  "otlook.com": "outlook.com",
  "outlook.con": "outlook.com",
  "outlook.co": "outlook.com",
  "outlock.com": "outlook.com",

  // Hotmail typos
  "hotmial.com": "hotmail.com",
  "hotmaill.com": "hotmail.com",
  "hotmai.com": "hotmail.com",
  "hotmale.com": "hotmail.com",
  "hotmail.con": "hotmail.com",
  "hotmail.co": "hotmail.com",

  // iCloud typos
  "icoud.com": "icloud.com",
  "iclod.com": "icloud.com",
  "icloud.con": "icloud.com",
  "icloud.co": "icloud.com",

  // Rediffmail typos
  "redifmail.com": "rediffmail.com",
  "rediff.com": "rediffmail.com",
  "rediffmail.co": "rediffmail.com",
  "rediffmail.con": "rediffmail.com",
  "redifmail.co": "rediffmail.com",
};

/**
 * Standard Levenshtein distance for 1-off fuzzy typo detection against popular consumer domains.
 */
function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Suggests a canonical domain correction for likely miskeys of popular domains.
 * Returns null if the domain is valid, popular, or belongs to a distinct third party/custom domain.
 */
export function suggestDomainCorrection(rawDomain: string): string | null {
  if (!rawDomain) return null;
  const lower = rawDomain.trim().toLowerCase();

  // If already an exact popular domain, no typo
  if ((POPULAR_DOMAINS as readonly string[]).includes(lower)) {
    return null;
  }

  // Exact known typo match
  if (KNOWN_DOMAIN_TYPOS[lower]) {
    return KNOWN_DOMAIN_TYPOS[lower];
  }

  // Check 1-edit distance against popular domains (e.g. gnail.com -> gmail.com)
  // Only trigger if domain ends with standard consumer TLD (.com, .co.in, .in)
  // to avoid falsely suggesting gmail.com for non-consumer corporate domains.
  const hasCommonTld = lower.endsWith(".com") || lower.endsWith(".in") || lower.endsWith(".co");
  if (hasCommonTld) {
    for (const popular of POPULAR_DOMAINS) {
      if (levenshteinDistance(lower, popular) === 1) {
        return popular;
      }
    }
  }

  return null;
}

/**
 * Normalizes an email address to its canonical form:
 * trimmed, lowercase, with leading/trailing whitespace removed.
 * Returns empty string if input is null or whitespace.
 */
export function normalizeEmail(input?: string): string {
  if (!input || typeof input !== "string") return "";
  return input.trim().toLowerCase();
}

/**
 * Validates an email address against strict syntactic, security, and length bounds.
 * Also performs safe internationalized domain normalization and mistake/typo detection.
 */
export function validateEmail(input?: string): EmailValidationResult {
  if (!input || typeof input !== "string") {
    return { isValid: false, error: "Email address is required." };
  }

  const clean = input.trim();
  if (clean.length === 0) {
    return { isValid: false, error: "Email address cannot be empty." };
  }

  // Total email RFC 5321 length check
  if (clean.length > 254) {
    return { isValid: false, error: "Email address cannot exceed 254 characters." };
  }
  if (clean.length < 5) {
    return { isValid: false, error: "Email address is too short." };
  }

  // Control characters guard (0x00 - 0x1F, 0x7F)
  if (/[\x00-\x1F\x7F]/.test(clean)) {
    return { isValid: false, error: "Email address cannot contain control characters." };
  }

  // Display-name syntax or angle brackets (< >)
  if (/[<>]/.test(clean)) {
    return { isValid: false, error: "Email address cannot contain display names or angle brackets (< >)." };
  }

  // Whitespace within string
  if (/\s/.test(clean)) {
    return { isValid: false, error: "Email address cannot contain internal spaces." };
  }

  // Unsafe quotes or punctuation tokens
  if (/['"\\;,]/.test(clean)) {
    return { isValid: false, error: "Email address contains invalid characters." };
  }

  // Exactly one @ symbol separator
  const parts = clean.split("@");
  if (parts.length !== 2) {
    return {
      isValid: false,
      error: parts.length > 2
        ? "Email address cannot contain multiple @ symbols."
        : "Email address must contain an @ symbol.",
    };
  }

  const [localPart, rawDomain] = parts;

  // Local-part checks
  if (!localPart || localPart.length === 0) {
    return { isValid: false, error: "Email username cannot be empty." };
  }
  if (localPart.length > 64) {
    return { isValid: false, error: "Email username cannot exceed 64 characters." };
  }
  if (localPart.startsWith(".") || localPart.endsWith(".")) {
    return { isValid: false, error: "Email username cannot start or end with a dot." };
  }
  if (localPart.includes("..")) {
    return { isValid: false, error: "Email username cannot contain consecutive dots." };
  }
  // Standard RFC 5322 permitted local characters
  if (!/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(localPart)) {
    return { isValid: false, error: "Email username contains invalid characters." };
  }

  // Domain checks
  if (!rawDomain || rawDomain.length === 0) {
    return { isValid: false, error: "Email domain cannot be empty." };
  }
  if (rawDomain.length > 255) {
    return { isValid: false, error: "Email domain cannot exceed 255 characters." };
  }
  if (
    rawDomain.startsWith(".") ||
    rawDomain.endsWith(".") ||
    rawDomain.startsWith("-") ||
    rawDomain.endsWith("-")
  ) {
    return { isValid: false, error: "Email domain has invalid boundary characters." };
  }
  if (rawDomain.includes("..")) {
    return { isValid: false, error: "Email domain cannot contain consecutive dots." };
  }
  if (!rawDomain.includes(".")) {
    return { isValid: false, error: "Email domain must include a top-level domain (e.g. .com)." };
  }

  // Safe Internationalized Domain Name (IDN) resolution via standard WHATWG URL
  let asciiDomain = "";
  try {
    const parsedUrl = new URL("http://" + rawDomain);
    asciiDomain = parsedUrl.hostname;
  } catch {
    return { isValid: false, error: "Invalid email domain format." };
  }

  if (!asciiDomain || asciiDomain.length === 0) {
    return { isValid: false, error: "Invalid email domain format." };
  }

  const labels = asciiDomain.split(".");
  if (labels.length < 2) {
    return { isValid: false, error: "Email domain must include a top-level domain." };
  }

  for (const label of labels) {
    if (!label || label.length > 63) {
      return { isValid: false, error: "Domain name label is invalid or exceeds 63 characters." };
    }
    if (!/^[a-z0-9-]+$/i.test(label)) {
      return { isValid: false, error: "Domain contains invalid characters." };
    }
    if (label.startsWith("-") || label.endsWith("-")) {
      return { isValid: false, error: "Domain labels cannot start or end with a hyphen." };
    }
  }

  const tld = labels[labels.length - 1];
  if (tld.length < 2 || /^\d+$/.test(tld)) {
    return { isValid: false, error: "Invalid top-level domain." };
  }

  const canonical = `${localPart.toLowerCase()}@${rawDomain.toLowerCase()}`;
  const suggestedDomain = suggestDomainCorrection(rawDomain);
  const suggestion = suggestedDomain ? `${localPart.toLowerCase()}@${suggestedDomain}` : undefined;

  return {
    isValid: true,
    canonical,
    localPart,
    domain: rawDomain,
    asciiDomain,
    suggestion,
  };
}
