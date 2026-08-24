// Pure JS export wrapper for Node test runner
export function scanForFraud(text) {
  if (!text || typeof text !== "string") {
    return { isFlagged: false };
  }

  const normalized = text.trim();

  // 1. UPI ID Check
  const upiMatch = normalized.match(/\b[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}\b/i);
  if (upiMatch && !upiMatch[0].includes(".com") && !upiMatch[0].includes(".org") && !upiMatch[0].includes(".net") && !upiMatch[0].includes(".io")) {
    return {
      isFlagged: true,
      reason: "Potential UPI payment solicitation detected",
      matchedPattern: upiMatch[0],
    };
  }

  // 2. Bank Account / IFSC Check
  if (/\b[A-Z]{4}0[A-Z0-9]{6}\b/i.test(normalized) || /(?:account|a\/c|acc)\s*(?:no\.?|number)?\s*[:#-]?\s*\d{8,18}/i.test(normalized)) {
    return {
      isFlagged: true,
      reason: "Bank account or IFSC routing details detected in message",
      matchedPattern: "BANK_ROUTING_DETAILS",
    };
  }

  // 3. Scam Keywords Check
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
