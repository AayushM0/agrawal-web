'use client';

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { requestPasswordReset, resetPasswordWithOtp } from "@/actions/auth";

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [infoMessage, setInfoMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  // Live password complexity indicators
  const hasMinLength = newPassword.length >= 8;
  const hasUpperCase = /[A-Z]/.test(newPassword);
  const hasLowerCase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const isMatching = newPassword.length > 0 && newPassword === confirmPassword;
  const isPasswordReady = hasMinLength && hasUpperCase && hasLowerCase && hasNumber && isMatching;

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setInfoMessage("");

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@") || cleanEmail.length < 5) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);
    const res = await requestPasswordReset(cleanEmail);
    setIsSubmitting(false);

    if (res.success) {
      setInfoMessage(res.message);
      setResendCooldown(60); // 60-second cooldown
      setStep(2);
    } else {
      setErrorMessage(res.error || "Failed to send reset code. Please try again.");
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setInfoMessage("");

    if (!otp.trim() || otp.trim().length !== 6) {
      setErrorMessage("Please enter the 6-digit verification code sent to your email.");
      return;
    }

    if (!isPasswordReady) {
      setErrorMessage("Please ensure your new password satisfies all complexity requirements and passwords match.");
      return;
    }

    setIsSubmitting(true);
    const res = await resetPasswordWithOtp({
      email: email.trim().toLowerCase(),
      otp: otp.trim(),
      newPassword,
    });
    setIsSubmitting(false);

    if (res.success) {
      setInfoMessage("Password reset successfully! Redirecting to your dashboard...");
      setTimeout(() => {
        router.push("/dashboard");
      }, 1200);
    } else {
      setErrorMessage(res.error || "Failed to reset password. Please check your verification code.");
    }
  };

  return (
    <main className="py-8 sm:py-14 bg-canvas-page">
      <div className="max-w-md mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <span className="text-xs font-bold uppercase va-badge-gold px-3 py-1 rounded-full mb-2 inline-block">
            Account Recovery • पासवर्ड पुनर्प्राप्ति
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-brand-primary">
            {step === 1 ? "Reset Your Password" : "Set New Password"}
          </h1>
          <p className="text-xs text-body-muted mt-1">
            {step === 1
              ? "Enter your registered email address to receive a secure 6-digit reset code."
              : `Enter the 6-digit code sent to ${email} and choose your new password.`}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white border border-brand-accent/30 rounded-3xl p-5 sm:p-8 shadow-warm">
          {step === 1 ? (
            /* STEP 1: Request Reset Code */
            <form onSubmit={handleRequestReset} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-body-heading mb-1.5">
                  Registered Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrorMessage("");
                  }}
                  placeholder="e.g. agarwal.family@example.com"
                  className="w-full px-4 py-2.5 rounded-xl border border-brand-accent/40 text-xs text-body-heading bg-canvas-warm/30 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
                <span className="text-[11px] text-body-muted block mt-1">
                  We will send a 10-minute one-time verification code to this address.
                </span>
              </div>

              {infoMessage && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
                  ✓ {infoMessage}
                </div>
              )}

              {errorMessage && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
                  ⚠️ {errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-full text-xs font-bold text-white va-btn-join shadow-goldCta transition-all mt-2"
              >
                {isSubmitting ? "Sending Reset Code..." : "Send Reset Code →"}
              </button>
            </form>
          ) : (
            /* STEP 2: Verify Code & Set New Password */
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-body-heading">
                    6-Digit Verification Code *
                  </label>
                  {resendCooldown > 0 ? (
                    <span className="text-[11px] text-body-muted font-mono">
                      Resend in {resendCooldown}s
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleRequestReset}
                      disabled={isSubmitting}
                      className="text-[11px] font-semibold text-brand-primary hover:underline"
                    >
                      Resend Code
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={otp}
                  onChange={(e) => {
                    setOtp(e.target.value.replace(/[^0-9]/g, ""));
                    setErrorMessage("");
                  }}
                  placeholder="e.g. 123456"
                  className="w-full px-4 py-2.5 rounded-xl border border-brand-accent/40 text-xs font-mono tracking-widest text-body-heading bg-canvas-warm/30 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>

              {/* Password Fields */}
              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-body-heading mb-1">
                    New Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        setErrorMessage("");
                      }}
                      placeholder="Min 8 characters"
                      className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-brand-accent/40 text-xs text-body-heading bg-canvas-warm/30 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-body-heading mb-1">
                    Confirm New Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setErrorMessage("");
                      }}
                      placeholder="Re-enter new password"
                      className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-brand-accent/40 text-xs text-body-heading bg-canvas-warm/30 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Password Strength Checklist */}
                <div className="p-3 rounded-xl bg-canvas-warm/40 border border-brand-accent/30 text-[11px] space-y-1">
                  <span className="font-bold text-brand-primary block mb-1">Password Requirements:</span>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-body-muted">
                    <div className={`flex items-center gap-1.5 ${hasMinLength ? "text-emerald-700 font-semibold" : ""}`}>
                      <span>{hasMinLength ? "✓" : "○"}</span> At least 8 characters
                    </div>
                    <div className={`flex items-center gap-1.5 ${hasUpperCase ? "text-emerald-700 font-semibold" : ""}`}>
                      <span>{hasUpperCase ? "✓" : "○"}</span> Uppercase letter (A-Z)
                    </div>
                    <div className={`flex items-center gap-1.5 ${hasLowerCase ? "text-emerald-700 font-semibold" : ""}`}>
                      <span>{hasLowerCase ? "✓" : "○"}</span> Lowercase letter (a-z)
                    </div>
                    <div className={`flex items-center gap-1.5 ${hasNumber ? "text-emerald-700 font-semibold" : ""}`}>
                      <span>{hasNumber ? "✓" : "○"}</span> Number (0-9)
                    </div>
                    <div className={`flex items-center gap-1.5 col-span-2 ${isMatching ? "text-emerald-700 font-semibold" : ""}`}>
                      <span>{isMatching ? "✓" : "○"}</span> Passwords match
                    </div>
                  </div>
                </div>
              </div>

              {infoMessage && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
                  ✓ {infoMessage}
                </div>
              )}

              {errorMessage && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
                  ⚠️ {errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || !isPasswordReady || otp.length !== 6}
                className={`w-full py-3 rounded-full text-xs font-bold text-white transition-all mt-2 ${
                  isPasswordReady && otp.length === 6 && !isSubmitting
                    ? "va-btn-join shadow-goldCta"
                    : "bg-gray-400 opacity-60 cursor-not-allowed"
                }`}
              >
                {isSubmitting ? "Updating Password..." : "Update Password & Sign In →"}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setOtp("");
                    setErrorMessage("");
                    setInfoMessage("");
                  }}
                  className="text-xs font-semibold text-body-muted hover:text-brand-primary"
                >
                  ← Change Email Address
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 pt-4 border-t border-brand-accent/20 text-center">
            <p className="text-xs text-body-muted">
              Remembered your password?{" "}
              <Link href="/login" className="font-bold text-brand-primary hover:underline">
                Sign In to Directory
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
