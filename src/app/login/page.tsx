'use client';

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSession } from "@/actions/session";
import { verifyAdminPassword, loginWithPassword, activateAccountWithOtp } from "@/actions/auth";
import { sendOtp } from "@/actions/otp";

export default function LoginPage() {
  const router = useRouter();

  const [role, setRole] = useState<"head" | "admin">("head");
  const [contact, setContact] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Activation fallback state
  const [isActivationMode, setIsActivationMode] = useState(false);
  const [activationOtp, setActivationOtp] = useState("");
  const [activationPassword, setActivationPassword] = useState("");
  const [activationConfirmPassword, setActivationConfirmPassword] = useState("");
  const [activationSuccess, setActivationSuccess] = useState("");
  const [activationInfo, setActivationInfo] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [showActivationPassword, setShowActivationPassword] = useState(false);

  const passHasLength = activationPassword.length >= 8;
  const passHasUpper = /[A-Z]/.test(activationPassword);
  const passHasLower = /[a-z]/.test(activationPassword);
  const passHasNumber = /[0-9]/.test(activationPassword);
  const isPassValid = passHasLength && passHasUpper && passHasLower && passHasNumber;

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("agrawal_login_contact");
      if (stored) {
        setContact(stored);
        sessionStorage.removeItem("agrawal_login_contact");
      }

      // Clean browser URL if query param is present
      if (window.location.search) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  const handleSendOtp = async () => {
    if (!contact.trim()) {
      setErrorMessage("Please enter your registered email or mobile number.");
      return;
    }
    setIsSendingOtp(true);
    setErrorMessage("");
    setActivationInfo("");
    try {
      const res = await sendOtp({ recipient: contact.trim() });
      if (res.success) {
        setOtpSent(true);
        setActivationInfo(res.message || "A 6-digit verification code has been dispatched.");
      } else {
        setErrorMessage(res.error || "Failed to dispatch verification code.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred while sending OTP.");
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleCompleteActivation = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setActivationSuccess("");

    if (!activationOtp || activationOtp.trim().length !== 6) {
      setErrorMessage("Please enter the 6-digit verification code sent to your contact.");
      return;
    }

    if (!activationPassword) {
      setErrorMessage("Please enter a new password.");
      return;
    }

    if (!isPassValid) {
      setErrorMessage("Password must be at least 8 characters long with uppercase, lowercase, and numeric digits.");
      return;
    }

    if (activationPassword !== activationConfirmPassword) {
      setErrorMessage("Passwords do not match. Please re-enter your password.");
      return;
    }

    setIsActivating(true);
    try {
      const res = await activateAccountWithOtp({
        contact: contact.trim(),
        otp: activationOtp.trim(),
        newPassword: activationPassword,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Activation failed. Please check your verification code.");
        setIsActivating(false);
        return;
      }

      setActivationSuccess("Account activated successfully! Redirecting to your dashboard...");
      setTimeout(() => {
        router.push("/dashboard");
      }, 850);
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred during activation.");
    } finally {
      setIsActivating(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    // 1. If Admin role, verify master security password
    if (role === "admin") {
      if (!adminPassword.trim()) {
        setErrorMessage("Admin Master Password is required to access the moderation portal.");
        return;
      }
      setIsSubmitting(true);
      const adminRes = await verifyAdminPassword(adminPassword);
      if (!adminRes.success) {
        setIsSubmitting(false);
        setErrorMessage(adminRes.error || "Invalid Admin Master Password. Access denied.");
        return;
      }

      // Create Admin Session
      await createSession({
        userId: `admin-${Date.now()}`,
        role: "admin",
        contact: contact.trim() || "admin@agarwal-foundation.org",
        householdStatus: "live",
      });

      setIsSubmitting(false);
      router.push("/admin/moderation");
      return;
    }

    // 2. Member Password Authentication (Head or Family Member)
    if (!contact.trim()) {
      setErrorMessage("Please enter your registered email address or mobile number.");
      return;
    }

    if (!password) {
      setErrorMessage("Please enter your account password.");
      return;
    }

    setIsSubmitting(true);
    const loginRes = await loginWithPassword({
      identifier: contact.trim(),
      password,
    });
    setIsSubmitting(false);

    if (loginRes.needsActivation) {
      setIsActivationMode(true);
      if (loginRes.contact) {
        setContact(loginRes.contact);
      }
      setErrorMessage(loginRes.error || "Account activation required. Please verify with OTP and create your password.");
      return;
    }

    if (!loginRes.success) {
      setErrorMessage(loginRes.error || "Invalid email or password.");
      return;
    }

    router.push("/dashboard");
  };

  return (
    <main className="py-8 sm:py-14 bg-canvas-page">
      <div className="max-w-md mx-auto px-4">
        <div className="text-center mb-6 sm:mb-8">
          <span className="text-xs font-bold uppercase va-badge-gold px-3 py-1 rounded-full mb-2 inline-block">
            Member Portal • प्रवेश द्वार
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-brand-primary">
            {role === "admin" ? "Community Admin Portal" : "Sign In to Directory"}
          </h1>
          <p className="text-xs text-body-muted mt-1">
            {role === "admin" 
              ? "Restricted access for authorized community moderators & executives."
              : "Access your household dashboard, family members, and claim links."}
          </p>
        </div>

        <div className="bg-white border border-brand-accent/30 rounded-3xl p-5 sm:p-8 shadow-warm">
          {isActivationMode ? (
            /* ACTIVATION VIEW */
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-brand-accent/20 mb-4">
                <div>
                  <h2 className="text-base font-bold text-brand-primary flex items-center gap-2">
                    <span>🔐</span> Verify &amp; Set Password
                  </h2>
                  <p className="text-xs text-body-muted">
                    Complete your registration by verifying with OTP and setting your password.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsActivationMode(false);
                    setErrorMessage("");
                    setActivationSuccess("");
                  }}
                  className="text-xs font-semibold text-brand-primary hover:underline shrink-0"
                >
                  ← Back to Sign In
                </button>
              </div>

              <form onSubmit={handleCompleteActivation} className="space-y-4">
                {/* Contact input with Send OTP */}
                <div>
                  <label className="block text-xs font-bold text-body-heading mb-1.5">
                    Registered Email or Mobile *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={contact}
                      onChange={(e) => {
                        setContact(e.target.value);
                        setErrorMessage("");
                      }}
                      placeholder="e.g. agarwal@example.com or 9876543210"
                      className="flex-1 px-4 py-2.5 rounded-xl border border-brand-accent/40 text-xs text-body-heading bg-canvas-warm/30 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                      required
                    />
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={isSendingOtp}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold text-white va-btn-join shadow-xs shrink-0 disabled:opacity-50"
                    >
                      {isSendingOtp ? "Sending..." : otpSent ? "Resend OTP" : "Send OTP"}
                    </button>
                  </div>
                </div>

                {activationInfo && (
                  <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-800 font-medium">
                    ℹ️ {activationInfo}
                  </div>
                )}

                {/* 6-digit OTP code */}
                <div>
                  <label className="block text-xs font-bold text-body-heading mb-1.5">
                    6-Digit Verification Code (ओ.टी.पी.) *
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="Enter 6-digit OTP"
                    value={activationOtp}
                    onChange={(e) => setActivationOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="w-full px-4 py-2.5 rounded-xl border border-brand-accent/40 text-sm font-mono tracking-widest text-center text-body-heading bg-white focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
                    required
                  />
                </div>

                {/* Password Fields */}
                <div className="space-y-3 pt-2 border-t border-brand-accent/15">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-body-heading">
                        New Password (नया पासवर्ड) *
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowActivationPassword(!showActivationPassword)}
                        className="text-[11px] font-medium text-brand-primary hover:underline"
                      >
                        {showActivationPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                    <input
                      type={showActivationPassword ? "text" : "password"}
                      placeholder="Create a secure password"
                      value={activationPassword}
                      onChange={(e) => setActivationPassword(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-brand-accent/40 text-xs text-body-heading bg-white focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
                      required
                    />
                  </div>

                  {/* Password Checklist */}
                  {activationPassword && (
                    <div className="p-3 rounded-xl bg-canvas-warm/40 border border-brand-accent/20 grid grid-cols-2 gap-1.5 text-[11px]">
                      <span className={`flex items-center gap-1.5 ${passHasLength ? "text-emerald-700 font-semibold" : "text-body-muted"}`}>
                        <span>{passHasLength ? "✓" : "○"}</span> 8+ characters
                      </span>
                      <span className={`flex items-center gap-1.5 ${passHasUpper ? "text-emerald-700 font-semibold" : "text-body-muted"}`}>
                        <span>{passHasUpper ? "✓" : "○"}</span> Uppercase (A-Z)
                      </span>
                      <span className={`flex items-center gap-1.5 ${passHasLower ? "text-emerald-700 font-semibold" : "text-body-muted"}`}>
                        <span>{passHasLower ? "✓" : "○"}</span> Lowercase (a-z)
                      </span>
                      <span className={`flex items-center gap-1.5 ${passHasNumber ? "text-emerald-700 font-semibold" : "text-body-muted"}`}>
                        <span>{passHasNumber ? "✓" : "○"}</span> Number (0-9)
                      </span>
                    </div>
                  )}

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-xs font-bold text-body-heading mb-1.5">
                      Confirm Password (पासवर्ड की पुष्टि करें) *
                    </label>
                    <input
                      type={showActivationPassword ? "text" : "password"}
                      placeholder="Re-enter your password"
                      value={activationConfirmPassword}
                      onChange={(e) => setActivationConfirmPassword(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-brand-accent/40 text-xs text-body-heading bg-white focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
                      required
                    />
                    {activationConfirmPassword && activationPassword !== activationConfirmPassword && (
                      <span className="text-[10px] text-red-600 block mt-1">Passwords do not match.</span>
                    )}
                  </div>
                </div>

                {errorMessage && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
                    ⚠️ {errorMessage}
                  </div>
                )}

                {activationSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-xs font-bold text-emerald-800">
                    ✓ {activationSuccess}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isActivating || !otpSent || !isPassValid}
                  className="w-full py-3 rounded-full text-xs font-bold text-white va-btn-join shadow-goldCta transition-all disabled:opacity-50"
                >
                  {isActivating ? "Activating..." : "Verify & Activate Account →"}
                </button>
              </form>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-body-heading mb-1.5">
                  Select Account Role
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRole("head");
                      setErrorMessage("");
                    }}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
                      role === "head"
                        ? "bg-brand-primary text-white shadow-sm"
                        : "bg-canvas-warm text-body-heading border border-brand-accent/30"
                    }`}
                  >
                    Household Head
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRole("admin");
                      setErrorMessage("");
                    }}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
                      role === "admin"
                        ? "bg-brand-primary text-white shadow-sm"
                        : "bg-canvas-warm text-body-heading border border-brand-accent/30"
                    }`}
                  >
                    🔒 Community Admin
                  </button>
                </div>
              </div>

              {/* ADMIN LOGIN FORM */}
              {role === "admin" ? (
                <div className="space-y-4 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-body-heading mb-1.5">
                      Admin Master Security Password
                    </label>
                    <input
                      type="password"
                      value={adminPassword}
                      onChange={(e) => {
                        setAdminPassword(e.target.value);
                        setErrorMessage("");
                      }}
                      placeholder="Enter Master Admin Password"
                      className="w-full px-4 py-2.5 rounded-xl border border-brand-accent/40 text-xs font-mono text-body-heading bg-canvas-warm/30 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                    <span className="text-[11px] text-body-muted block mt-1">
                      Protected with constant-time cryptographic verification.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-body-heading mb-1.5">
                      Admin Email (Optional)
                    </label>
                    <input
                      type="email"
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      placeholder="admin@agarwal-foundation.org"
                      className="w-full px-4 py-2.5 rounded-xl border border-brand-accent/40 text-xs text-body-heading bg-canvas-warm/30 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                  </div>
                </div>
              ) : (
                /* MEMBER PASSWORD LOGIN FORM */
                <div className="space-y-4 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-body-heading mb-1.5">
                      Email Address or Mobile Number *
                    </label>
                    <input
                      type="text"
                      value={contact}
                      onChange={(e) => {
                        setContact(e.target.value);
                        setErrorMessage("");
                      }}
                      placeholder="e.g. agarwal.family@example.com or 9876543210"
                      className="w-full px-4 py-2.5 rounded-xl border border-brand-accent/40 text-xs text-body-heading bg-canvas-warm/30 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                    <span className="text-[11px] text-body-muted block mt-1">
                      Enter the email address or phone number registered with your family.
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-body-heading">
                        Password *
                      </label>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setIsActivationMode(true);
                            setErrorMessage("");
                          }}
                          className="text-[11px] font-semibold text-brand-primary hover:underline"
                        >
                          Activate Account?
                        </button>
                        <Link
                          href="/forgot-password"
                          className="text-[11px] font-semibold text-brand-primary hover:underline"
                        >
                          Forgot Password?
                        </Link>
                      </div>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          setErrorMessage("");
                        }}
                        placeholder="Enter your account password"
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
                {isSubmitting
                  ? "Verifying Credentials..."
                  : role === "admin"
                  ? "Unlock Admin Moderation Portal →"
                  : "Sign In to Household Dashboard →"}
              </button>
            </form>
          )}

          <div className="mt-6 pt-4 border-t border-brand-accent/20 text-center">
            <p className="text-xs text-body-muted">
              Haven&apos;t registered your family yet?{" "}
              <Link href="/signup" className="font-bold text-brand-primary hover:underline">
                Register Family Free
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}