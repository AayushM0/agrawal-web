'use client';

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSession, createSession, verifyAdminPassword, loginWithPassword } from "@/actions/auth";

export default function LoginPage() {
  const router = useRouter();

  const [role, setRole] = useState<"head" | "admin">("head");
  const [contact, setContact] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

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
                    <Link
                      href="/forgot-password"
                      className="text-[11px] font-semibold text-brand-primary hover:underline"
                    >
                      Forgot Password?
                    </Link>
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