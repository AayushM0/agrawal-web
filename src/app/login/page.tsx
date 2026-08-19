'use client';

import { createSession } from "@/actions/auth";


import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<"head" | "admin">("head");
  const [contact, setContact] = useState("+91 98765 43210");
  const [otp, setOtp] = useState("123456");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    await createSession({
      userId: `u-${Date.now()}`,
      role,
      contact,
      householdStatus: role === "admin" ? "live" : "live",
    });

    setIsSubmitting(false);
    if (role === "admin") {
      router.push("/admin/moderation");
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <main className="py-14 bg-canvas-page">
      <div className="max-w-md mx-auto px-4">
        <div className="text-center mb-8">
          <span className="text-xs font-bold uppercase va-badge-gold px-3 py-1 rounded-full mb-2 inline-block">
            Member Portal • प्रवेश द्वार
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-brand-primary">
            Sign In to Directory
          </h1>
          <p className="text-xs text-body-muted mt-1">
            Access your household dashboard, claimed profile, or moderation queue.
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
                  onClick={() => setRole("head")}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                    role === "head"
                      ? "bg-brand-primary text-white"
                      : "bg-canvas-warm text-body-heading border border-brand-accent/30"
                  }`}
                >
                  Household Head
                </button>
                <button
                  type="button"
                  onClick={() => setRole("admin")}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                    role === "admin"
                      ? "bg-brand-primary text-white"
                      : "bg-canvas-warm text-body-heading border border-brand-accent/30"
                  }`}
                >
                  Community Admin
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-body-heading mb-1.5">
                Registered Mobile or Email
              </label>
              <input
                type="text"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-4 py-2.5 rounded-xl border border-brand-accent/40 text-xs text-body-heading bg-canvas-warm/30 focus:ring-1 focus:ring-brand-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-body-heading mb-1.5">
                One-Time Passcode (OTP)
              </label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="6-digit OTP"
                className="w-full px-4 py-2.5 rounded-xl border border-brand-accent/40 text-xs font-mono text-body-heading bg-canvas-warm/30 focus:ring-1 focus:ring-brand-primary"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-full text-xs font-bold text-white va-btn-maroon"
            >
              {isSubmitting ? "Logging In..." : `Sign In as ${role === "admin" ? "Admin" : "Household Head"} →`}
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