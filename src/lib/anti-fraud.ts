/**
 * Deterministic In-Stream Anti-Fraud & Scam Heuristics Engine
 * Protects community members from financial scams, unsolicited UPI solicitations, and phishing links.
 */

export interface FraudScanResult {
  isFlagged: boolean;
  reason?: string;
  matchedPattern?: string;
}

// UPI Handle pattern: username@bank / username@upi / etc.
const UPI_REGEX = /\b[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}\b/i;

// IFSC Code pattern: 4 letters, 0, followed by 6 alphanumeric
const IFSC_REGEX = /\b[A-Z]{4}0[A-Z0-9]{6}\b/i;

// Account number + IFSC transfer pattern
const BANK_ACCOUNT_REGEX = /(?:account|a\/c|acc)\s*(?:no\.?|number)?\s*[:#-]?\s*\d{8,18}/i;

// High-Risk Financial & Investment Scam Keywords
const SCAM_KEYWORDS = [
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
];

export function scanForFraud(text: string): FraudScanResult {
  if (!text || typeof text !== "string") {
    return { isFlagged: false };
  }

  const normalized = text.trim();

  // 1. UPI ID Check
  const upiMatch = normalized.match(UPI_REGEX);
  if (upiMatch && !upiMatch[0].includes(".com") && !upiMatch[0].includes(".org") && !upiMatch[0].includes(".net")) {
    return {
      isFlagged: true,
      reason: "Potential UPI payment solicitation detected",
      matchedPattern: upiMatch[0],
    };
  }

  // 2. Bank Account / IFSC Check
  if (IFSC_REGEX.test(normalized) || BANK_ACCOUNT_REGEX.test(normalized)) {
    return {
      isFlagged: true,
      reason: "Bank account or IFSC routing details detected in message",
      matchedPattern: "BANK_ROUTING_DETAILS",
    };
  }

  // 3. Scam Keywords Check
  const lower = normalized.toLowerCase();
  for (const keyword of SCAM_KEYWORDS) {
    if (lower.includes(keyword)) {
      return {
        isFlagged: true,
        reason: `High-risk financial phrase detected: "${keyword}"`,
        matchedPattern: keyword,
      };
    }
  }

  return { isFlagged: false };
}
