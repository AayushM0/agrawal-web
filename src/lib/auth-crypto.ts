import bcrypt from "bcryptjs";

export interface PasswordValidationResult {
  valid: boolean;
  error?: string;
}

export interface LockoutResult {
  locked: boolean;
  remainingMinutes?: number;
}

/**
 * OWASP A07: Validates password complexity
 * - Minimum 8 characters
 * - Maximum 72 characters (prevent bcrypt denial-of-service)
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one digit
 */
export function validatePassword(password: string): PasswordValidationResult {
  if (!password || typeof password !== "string") {
    return { valid: false, error: "Password is required." };
  }
  if (password.length < 8) {
    return { valid: false, error: "Password must be at least 8 characters long." };
  }
  if (password.length > 72) {
    return { valid: false, error: "Password cannot exceed 72 characters." };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: "Password must contain at least one uppercase letter." };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: "Password must contain at least one lowercase letter." };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: "Password must contain at least one number." };
  }
  return { valid: true };
}

/**
 * OWASP A02: Hashes password using bcrypt with Cost Factor 12.
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

/**
 * OWASP A02 & A07: Verifies password against bcrypt hash in constant time.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) return false;
  return bcrypt.compare(password, hash);
}

/**
 * OWASP A07: Evaluates brute-force lockout status based on recent attempts.
 * 5 or more failed attempts within 15 minutes triggers a 15-minute lockout.
 */
export function evaluateLockout(
  recentAttempts: Array<{ success: boolean; created_at: string | Date }>,
  currentTime: number = Date.now()
): LockoutResult {
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxFailedAttempts = 5;

  const recentFailures = recentAttempts.filter((a) => {
    if (a.success) return false;
    const attemptTime = new Date(a.created_at).getTime();
    return currentTime - attemptTime <= windowMs;
  });

  if (recentFailures.length >= maxFailedAttempts) {
    const latestTime = Math.max(...recentFailures.map((a) => new Date(a.created_at).getTime()));
    const unlockTime = latestTime + windowMs;
    const remainingMs = Math.max(0, unlockTime - currentTime);
    const remainingMinutes = Math.max(1, Math.ceil(remainingMs / (60 * 1000)));

    if (remainingMinutes > 0 && remainingMs > 0) {
      return { locked: true, remainingMinutes };
    }
  }

  return { locked: false };
}
