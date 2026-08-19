'use client';

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { sendOtp, verifyOtp } from "@/actions/otp";
import { getSession, createSession, verifyAdminPassword } from "@/actions/auth";

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<"head" | "admin">("head");
  const [contact, setContact] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpMessage, setOtpMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function checkAuth() {
      const session = await getSession();
      if (session) {
        if (session.role === "admin") {
          router.push("/admin/moderation");
        } else {
          router.push("/dashboard");
        }
      }
    }
    checkAuth();
  }, [router]);

  const handleSendOtp = async () => {
    if (!contact.trim() || contact.trim().length < 5) {
      setErrorMessage("Please enter a valid mobile number or email address.");
      return;
    }
    setIsSendingOtp(true);
    setErrorMessage("");
    setOtpMessage("");

    const isPhone = !contact.includes("@");
    const res = await sendOtp({
      recipient: contact,
      type: isPhone ? "whatsapp" : "email",
    });

    setIsSendingOtp(false);
    if (res.success) {
      setOtpSent(true);
      setOtpMessage(res.message || "Passcode sent successfully.");
    } else {
      setErrorMessage(res.error || "Failed to send OTP. Please check your contact details.");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    
    // 1. If Admin role, verify master security password first
    if (role === "admin") {
      if (!adminPassword.trim()) {
        setErrorMessage("Admin Master Password is required to access the moderation portal.");
        return;
      }
      setIsSubmitting(true);
      const isPasswordValid = await verifyAdminPassword(adminPassword);
      if (!isPasswordValid) {
        setIsSubmitting(false);
        setErrorMessage("Invalid Admin Master Password. Access denied.");
        return;
      }

      // Create Admin Session
      await createSession({
        userId: `admin-${Date.now()}`,
        role: "admin",
        contact: contact.trim() || "admin@agrawal-foundation.org",
        householdStatus: "live",
      });

      setIsSubmitting(false);
      router.push("/admin/moderation");
      return;
    }

    // 2. If Household Head role, verify OTP
    if (!contact.trim()) {
      setErrorMessage("Please enter your registered mobile number or email.");
      return;
    }

    if (!otp.trim() || otp.trim().length !== 6) {
      setErrorMessage("Please enter the 6-digit verification passcode (OTP).");
      return;
    }

    setIsSubmitting(true);

    const verifyRes = await verifyOtp({ recipient: contact, otp });
    if (!verifyRes.success) {
      setIsSubmitting(false);
      setErrorMessage(verifyRes.error || "Invalid or expired OTP passcode.");
      return;
    }

    await createSession({
      userId: `u-${Date.now()}`,
      role: "head",
      contact: contact.trim(),
      householdStatus: "live",
    });

    setIsSubmitting(false);
    router.push("/dashboard");
  };

  return (
    <main className="py-14 bg-canvas-page">
      <div className="max-w-md mx-auto px-4">
        <div className="text-center mb-8">
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

        <div className="bg-white border border-brand-accent/30 rounded-3xl p-6 sm:p-8 shadow-warm">
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
                    placeholder="admin@agrawal-foundation.org"
                    className="w-full px-4 py-2.5 rounded-xl border border-brand-accent/40 text-xs text-body-heading bg-canvas-warm/30 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>
              </div>
            ) : (
              /* HOUSEHOLD HEAD LOGIN FORM */
              <div className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-body-heading mb-1.5">
                    Registered Mobile (WhatsApp) or Email
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={contact}
                      onChange={(e) => {
                        setContact(e.target.value);
                        setOtpSent(false);
                        setOtpMessage("");
                        setErrorMessage("");
                      }}
                      placeholder="+91 98765 43210 or email@domain.com"
                      className="flex-1 px-4 py-2.5 rounded-xl border border-brand-accent/40 text-xs text-body-heading bg-canvas-warm/30 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={isSendingOtp}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold bg-canvas-warm text-brand-primary border border-brand-accent hover:bg-white transition-all shrink-0"
                    >
                      {isSendingOtp ? "Sending..." : (otpSent ? "Resend" : "Send OTP")}
                    </button>
                  </div>
                </div>

                {otpMessage && (
                  <p className="text-[11px] font-semibold text-emerald-700">
                    {otpMessage}
                  </p>
                )}

                <div>
                  <label className="block text-xs font-bold text-body-heading mb-1.5">
                    One-Time Passcode (OTP)
                  </label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter 6-digit OTP received"
                    className="w-full px-4 py-2.5 rounded-xl border border-brand-accent/40 text-xs font-mono text-body-heading bg-canvas-warm/30 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-full text-xs font-bold text-white va-btn-maroon shadow-warm"
            >
              {isSubmitting 
                ? "Verifying Access..." 
                : role === "admin" 
                  ? "Unlock Admin Moderation Portal →" 
                  : "Verify OTP & Open Dashboard →"}
            </button>
          </form>

          <div className="pt-6 mt-6 border-t border-brand-accent/20 text-center text-xs text-body-muted">
            New to the community?{" "}
            <Link href="/signup" className="text-brand-primary font-bold hover:underline">
              Register Your Family Free
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}