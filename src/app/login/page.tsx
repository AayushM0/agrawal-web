'use client';

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { sendOtp, verifyOtp } from "@/actions/otp";
import { checkContactRegistration } from "@/actions/register";
import { getSession, createSession, verifyAdminPassword, loginWithVerifiedContact } from "@/actions/auth";
import PhoneInputWithCountry from "@/components/PhoneInputWithCountry";

export default function LoginPage() {
  const router = useRouter();

  const [role, setRole] = useState<"head" | "admin">("head");
  const [loginMethod, setLoginMethod] = useState<"phone" | "email">("phone");
  const [contact, setContact] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpMessage, setOtpMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [notRegistered, setNotRegistered] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("agrawal_login_contact");
      if (stored) {
        setContact(stored);
        setLoginMethod(stored.includes("@") ? "email" : "phone");
        sessionStorage.removeItem("agrawal_login_contact");
      }

      // Clean browser URL if query param is present
      if (window.location.search) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

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
    setNotRegistered(false);

    // 1. Check whether contact exists in the database
    const checkRes = await checkContactRegistration(contact.trim());
    if (!checkRes.isRegistered) {
      setIsSendingOtp(false);
      setNotRegistered(true);
      setErrorMessage("This contact number/email is not registered with any family yet. Redirecting to Free Registration...");
      if (typeof window !== "undefined") {
        sessionStorage.setItem("agrawal_signup_contact", contact.trim());
      }
      setTimeout(() => {
        router.push("/signup");
      }, 1500);
      return;
    }

    // 2. Contact exists -> dispatch OTP
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

    const loginRes = await loginWithVerifiedContact(contact);
    if (!loginRes.success) {
      setIsSubmitting(false);
      setErrorMessage(loginRes.error || "Failed to locate registered family record.");
      return;
    }

    setIsSubmitting(false);
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
              /* HOUSEHOLD HEAD LOGIN FORM */
              <div className="space-y-4 pt-2">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-body-heading">
                      Verification Method
                    </label>
                    <div className="flex gap-3 text-xs">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="loginMethod"
                          checked={loginMethod === "phone"}
                          onChange={() => {
                            setLoginMethod("phone");
                            setContact("");
                            setOtpSent(false);
                            setOtpMessage("");
                            setErrorMessage("");
                          }}
                          className="text-brand-primary focus:ring-brand-primary"
                        />
                        <span className="font-semibold text-body-heading">Mobile (OTP)</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="loginMethod"
                          checked={loginMethod === "email"}
                          onChange={() => {
                            setLoginMethod("email");
                            setContact("");
                            setOtpSent(false);
                            setOtpMessage("");
                            setErrorMessage("");
                          }}
                          className="text-brand-primary focus:ring-brand-primary"
                        />
                        <span className="font-semibold text-body-heading">Email (OTP)</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    {loginMethod === "phone" ? (
                      <div className="w-full sm:flex-1">
                        <PhoneInputWithCountry
                          value={contact}
                          onChange={(full) => {
                            setContact(full);
                            setOtpSent(false);
                            setOtpMessage("");
                            setErrorMessage("");
                          }}
                          placeholder="e.g. 98765 43210"
                        />
                      </div>
                    ) : (
                      <input
                        type="email"
                        value={contact}
                        onChange={(e) => {
                          setContact(e.target.value);
                          setOtpSent(false);
                          setOtpMessage("");
                          setErrorMessage("");
                        }}
                        placeholder="registered@example.com"
                        className="w-full sm:flex-1 px-4 py-2.5 rounded-xl border border-brand-accent/40 text-xs text-body-heading bg-canvas-warm/30 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                      />
                    )}
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={isSendingOtp}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold bg-canvas-warm text-brand-primary border border-brand-accent hover:bg-white transition-all shrink-0"
                    >
                      {isSendingOtp ? "Sending..." : (otpSent ? "Resend" : "Send OTP")}
                    </button>
                  </div>
                </div>

                {otpMessage && (
                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] font-semibold text-emerald-800">
                    {otpMessage}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-body-heading mb-1.5">
                    One-Time Passcode (OTP)
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter 6-digit OTP"
                    className="w-full px-4 py-2.5 rounded-xl border border-brand-accent/40 text-xs font-mono text-body-heading bg-canvas-warm/30 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                  <span className="text-[11px] text-body-muted block mt-1">
                    Passcode delivered via WhatsApp or Email.
                  </span>
                </div>
              </div>
            )}

            {notRegistered && (
              <div className="p-4 rounded-2xl bg-amber-50 border-2 border-brand-gold/60 space-y-2 animate-in fade-in">
                <div className="flex items-start gap-2.5">
                  <span className="text-xl">🏡</span>
                  <div>
                    <h4 className="text-xs font-bold text-brand-primary">No Family Registration Found</h4>
                    <p className="text-[11px] text-body-text leading-relaxed mt-0.5">
                      This mobile/email is not registered with any family. Please complete the one-time free registration first.
                    </p>
                  </div>
                </div>
                <Link
                  href="/signup"
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      sessionStorage.setItem("agrawal_signup_contact", contact.trim());
                    }
                  }}
                  className="block w-full py-2 px-4 rounded-xl text-xs font-bold text-center text-white va-btn-join shadow-sm mt-1"
                >
                  Register Family Free (Sign Up) →
                </Link>
              </div>
            )}

            {errorMessage && !notRegistered && (
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