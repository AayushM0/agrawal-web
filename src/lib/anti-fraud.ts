/**
 * Deterministic In-Stream Anti-Fraud & Scam Heuristics Engine
 * Protects community members from financial scams, unsolicited UPI solicitations, and phishing links.
 */

export interface FraudScanResult {
  isFlagged: boolean;
  reason?: string;
  matchedPattern?: string;
  category?: "upi" | "bank_routing" | "scam_keyword" | "suspicious_link";
}

// UPI Handle pattern: username@bank / username@upi / etc.
const UPI_REGEX = /\b[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}\b/i;

// IFSC Code pattern: 4 letters, 0, followed by 6 alphanumeric
const IFSC_REGEX = /\b[A-Z]{4}0[A-Z0-9]{6}\b/i;

// Account number + IFSC transfer pattern
const BANK_ACCOUNT_REGEX = /(?:account|a\/c|acc)\s*(?:no\.?|number)?\s*[:#-]?\s*\d{8,18}/i;

// Suspicious URL Shorteners & Phishing Link patterns
const SUSPICIOUS_LINK_REGEX = /\bhttps?:\/\/(?:www\.)?(?:bit\.ly|tinyurl\.com|t\.me|wa\.me|cutt\.ly|is\.gd|rb\.gy)\/[a-zA-Z0-9_\-]+/i;

// High-Risk Financial & Investment Scam Keywords (English & Hindi/Devanagari)
const SCAM_KEYWORDS = [
  // English
  "guaranteed return",
  "investment scheme",
  "crypto investment",
  "forex trading profit",
  "send money urgently",
  "urgent transfer",
  "wire funds",
  "send money to claim",
  "lottery winner",
  "share your otp",
  "send me the otp",
  "bank account password",

  // Hindi / Devanagari
  "पैसे भेजो",
  "खाते में ट्रांसफर",
  "रुपये ट्रांसफर",
  "ओटीपी शेयर",
  "ओटीपी बताओ",
  "लॉटरी इनाम",
  "पैसे कमाएं",
  "गारंटीड रिटर्न",
];

export function scanForFraud(text: string): FraudScanResult {
  if (!text || typeof text !== "string") {
    return { isFlagged: false };
  }

  const normalized = text.trim();

  // 1. Suspicious Links & Shorteners Check
  const linkMatch = normalized.match(SUSPICIOUS_LINK_REGEX);
  if (linkMatch) {
    return {
      isFlagged: true,
      category: "suspicious_link",
      reason: `Suspicious URL shortener/unverified link detected: ${linkMatch[0]}`,
      matchedPattern: linkMatch[0],
    };
  }

  // 2. UPI ID Check
  const upiMatch = normalized.match(UPI_REGEX);
  if (upiMatch && !upiMatch[0].includes(".com") && !upiMatch[0].includes(".org") && !upiMatch[0].includes(".net") && !upiMatch[0].includes(".io")) {
    return {
      isFlagged: true,
      category: "upi",
      reason: "Potential UPI payment solicitation detected",
      matchedPattern: upiMatch[0],
    };
  }

  // 3. Bank Account / IFSC Check
  if (IFSC_REGEX.test(normalized) || BANK_ACCOUNT_REGEX.test(normalized)) {
    return {
      isFlagged: true,
      category: "bank_routing",
      reason: "Bank account or IFSC routing details detected in message",
      matchedPattern: "BANK_ROUTING_DETAILS",
    };
  }

  // 4. Scam Keywords Check (Multi-lingual)
  const lower = normalized.toLowerCase();
  for (const keyword of SCAM_KEYWORDS) {
    if (lower.includes(keyword.toLowerCase())) {
      return {
        isFlagged: true,
        category: "scam_keyword",
        reason: `High-risk financial phrase detected: "${keyword}"`,
        matchedPattern: keyword,
      };
    }
  }

  return { isFlagged: false };
}
