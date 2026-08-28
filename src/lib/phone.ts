export function normalizePhoneNumber(input: string): string {
  if (!input) return "";
  let digits = input.trim().replace(/[^0-9+]/g, "");

  // Handle leading 00 international prefix
  if (digits.startsWith("00")) {
    digits = "+" + digits.slice(2);
  }

  // Handle +9109876543210 where leading 0 was entered with +91 country code
  if (digits.startsWith("+910") && digits.length === 14) {
    digits = "+91" + digits.slice(4);
  }

  // Handle standard Indian 10-digit mobile with leading 0 (e.g., 09876543210)
  if (digits.startsWith("0") && digits.length === 11) {
    digits = "+91" + digits.slice(1);
  }

  // Handle 10-digit raw number
  if (!digits.startsWith("+")) {
    if (digits.length === 10) {
      digits = "+91" + digits;
    } else if (digits.startsWith("91") && digits.length === 12) {
      digits = "+" + digits;
    } else {
      digits = "+" + digits;
    }
  }
  return digits;
}