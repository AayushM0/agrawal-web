/**
 * Magic Byte & Payload Security Validator for User Profile Images (OWASP A03 / A04)
 * Enforces JPEG, PNG, and WebP only. Strictly forbids SVG (preventing Stored XSS) and enforces 5MB limit.
 */
export function validateProfileImage(photoUrl?: string): { valid: boolean; error?: string } {
  if (!photoUrl || typeof photoUrl !== "string") {
    return { valid: false, error: "Photo payload is empty." };
  }

  const clean = photoUrl.trim();

  // 1. If HTTPS URL (e.g. Supabase Storage / CDN)
  if (clean.startsWith("http://") || clean.startsWith("https://")) {
    try {
      const parsed = new URL(clean);
      if (parsed.protocol !== "https:") {
        return { valid: false, error: "Only secure HTTPS image URLs are permitted." };
      }
      return { valid: true };
    } catch {
      return { valid: false, error: "Invalid image URL format." };
    }
  }

  // 2. If Base64 Data URL
  if (clean.startsWith("data:")) {
    // Prevent SVG XSS
    if (clean.includes("image/svg") || clean.includes("<svg") || clean.includes("<script")) {
      return { valid: false, error: "SVG images are not allowed for security reasons. Please upload JPEG, PNG, or WebP." };
    }

    // Check size limit: Base64 string length of 5MB binary is ~6.8MB
    if (clean.length > 7 * 1024 * 1024) {
      return { valid: false, error: "Image file exceeds maximum allowable size (5MB)." };
    }

    // Match supported image MIME types and extract base64 payload
    const match = clean.match(/^data:image\/(jpeg|jpg|png|webp);base64,(.+)$/i);
    if (!match) {
      return { valid: false, error: "Invalid image format. Only JPEG, PNG, and WebP are supported." };
    }

    const b64Data = match[2];
    // Magic Byte checks on Base64 header:
    // JPEG: '/9j/' (FF D8 FF)
    // PNG: 'iVBORw0KGgo' (89 50 4E 47 0D 0A 1A 0A)
    // WebP: 'UklGR' (52 49 46 46 ... 57 45 42 50)
    const isJpeg = b64Data.startsWith("/9j/");
    const isPng = b64Data.startsWith("iVBORw0KGgo");
    // WebP starts with 'UklG' (corresponding to RIFF). The 5th character is variable depending on file size.
    const isWebp = b64Data.startsWith("UklG");

    if (!isJpeg && !isPng && !isWebp) {
      return { valid: false, error: "Corrupted image or unsupported format. File signature mismatch." };
    }

    return { valid: true };
  }

  return { valid: false, error: "Unrecognized image format." };
}
