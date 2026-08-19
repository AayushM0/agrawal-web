'use client';

import { registerHousehold } from "@/actions/register";
import { sendOtp, verifyOtp } from "@/actions/otp";


import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import WizardProgressBar from "@/components/wizard/WizardProgressBar";
import { gotras } from "@/data/gotras";
import { Household, Member } from "@/types/household";

function SignupContent() {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Form State
  const [contactType, setContactType] = useState<"phone" | "email">("phone");
  const [contactValue, setContactValue] = useState("");
  const [otpValue, setOtpValue] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpMessage, setOtpMessage] = useState("");
  const [otpError, setOtpError] = useState("");

  const handleSendOtp = async () => {
    if (!contactValue.trim()) {
      setOtpError(contactType === "phone" ? "Please enter your mobile number." : "Please enter your email address.");
      return;
    }
    setIsSendingOtp(true);
    setOtpError("");
    setOtpMessage("");
    const res = await sendOtp({ recipient: contactValue, type: contactType === "phone" ? "sms" : "email" });
    setIsSendingOtp(false);
    if (res.success) {
      setOtpMessage(res.message || '');
      // Waiting for user to type OTP received on WhatsApp
    } else {
      setOtpError(res.error || "Failed to send OTP.");
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpValue.trim()) {
      setOtpError("Please enter the 6-digit OTP.");
      return;
    }
    setOtpError("");
    setOtpMessage("");
    const res = await verifyOtp({ recipient: contactValue, otp: otpValue });
    if (res.success) {
      setOtpVerified(true);
      setOtpMessage("✓ Contact verified successfully! Auto-advancing...");
      setTimeout(() => {
        setStep(2);
      }, 500);
    } else {
      setOtpError(res.error || "Invalid OTP code.");
    }
  };

  const [headName, setHeadName] = useState("");
  const [nativePlace, setNativePlace] = useState("");
  const [gotra, setGotra] = useState("");

  const [members, setMembers] = useState<Member[]>([
    {
      id: "m-1",
      fullName: "",
      relationToHead: "self",
      dob: "",
      gender: "Male",
      maritalStatus: "Married",
      currentCity: "",
      currentCountry: "India",
      profession: "",
      verifiedBySelf: true,
      ownerLocked: true,
      visibility: {
        contactInfo: "members_only",
        dob: "hidden",
        photo: "public_to_members",
      },
    },
  ]);

  const [consentGiven, setConsentGiven] = useState(false);

  // Member Management Helpers
  const addMember = () => {
    const newMember: Member = {
      id: `m-${Date.now()}`,
      fullName: "",
      relationToHead: "son",
      dob: "",
      gender: "Male",
      maritalStatus: "Unmarried",
      currentCity: nativePlace,
      currentCountry: "India",
      profession: "",
      verifiedBySelf: false,
      ownerLocked: false,
      visibility: {
        contactInfo: "members_only",
        dob: "hidden",
        photo: "public_to_members"
      }
    };
    setMembers([...members, newMember]);
  };

  const updateMember = (id: string, field: keyof Member, value: any) => {
    setMembers(
      members.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );
  };

  const updateVisibility = (
    memberId: string,
    field: "contactInfo" | "dob" | "photo",
    value: any
  ) => {
    setMembers(
      members.map((m) =>
        m.id === memberId
          ? { ...m, visibility: { ...m.visibility, [field]: value } }
          : m
      )
    );
  };

  const removeMember = (id: string) => {
    if (members.length <= 1) return;
    setMembers(members.filter((m) => m.id !== id));
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consentGiven) return;
    setIsSubmitting(true);
    
    const res = await registerHousehold({
      headName,
      verifiedContact: contactValue,
      gotra,
      nativePlace,
      members,
      consentAccepted: consentGiven,
    });

    setIsSubmitting(false);
    if (res.success) {
      setIsSuccess(true);
    } else {
      alert(res.error || "Registration failed. Please check inputs.");
    }
  };

  if (isSuccess) {
    return (
      <main className="py-16 bg-canvas-page min-h-[70vh] flex items-center">
        <div className="max-w-xl mx-auto px-4 w-full text-center">
          <div className="bg-white border-2 border-brand-accent/40 rounded-3xl p-8 sm:p-12 shadow-warmLg">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-3xl font-bold mx-auto mb-4 border border-emerald-300">
              ✓
            </div>
            <span className="inline-block text-xs font-bold uppercase va-badge-pending px-3 py-1 rounded-full mb-3">
              Status: Under Review (Pending)
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-brand-primary mb-3">
              Registration Submitted Successfully!
            </h1>
            <p className="text-xs sm:text-sm text-body-text leading-relaxed mb-6">
              Thank you for registering your family in the <strong>Global Agrawal Directory</strong>. Your submission is now in the community moderation queue. Once approved by our team, your household profile will go live.
            </p>
            <div className="p-4 rounded-xl bg-canvas-warm border border-brand-accent/30 text-xs font-mono text-brand-primary mb-6">
              Temporary Reference ID: #AGR-2026-8812
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/dashboard" className="px-6 py-3 rounded-full text-xs font-bold text-white va-btn-maroon">
                Go to Household Dashboard →
              </Link>
              <Link href="/" className="px-6 py-3 rounded-full text-xs font-bold text-body-heading bg-canvas-warm hover:bg-white border border-brand-accent/30">
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="py-12 bg-canvas-page">
      <div className="max-w-3xl mx-auto px-4">
        <div className="text-center mb-8">
          <span className="text-xs font-bold uppercase va-badge-gold px-3 py-1 rounded-full mb-2 inline-block">
            Free Community Registration • निःशुल्क पंजीकरण
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-brand-primary">
            Register Your Family
          </h1>
          <p className="text-xs sm:text-sm text-body-muted mt-1">
            Fill in the verified household details below. You control privacy for every family member.
          </p>
        </div>

        <div className="bg-white border border-brand-accent/30 rounded-3xl p-6 sm:p-10 shadow-warm">
          <WizardProgressBar currentStep={step} totalSteps={5} />

          {/* STEP 1: CONTACT VERIFICATION */}
          {step === 1 && (
            <div>
              <h2 className="text-lg font-bold text-brand-primary mb-1">
                Step 1: Head of Household Contact Verification
              </h2>
              <p className="text-xs text-body-muted mb-6">
                Enter your mobile number or email to receive a one-time verification passcode (OTP).
              </p>

              <div className="space-y-4 mb-8">
                <div>
                  <label className="block text-xs font-bold text-body-heading mb-1.5">
                    Verification Method
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                      <input
                        type="radio"
                        checked={contactType === "phone"}
                        onChange={() => {
                          setContactType("phone");
                          setContactValue("");
                          setOtpValue("");
                          setOtpVerified(false);
                          setOtpMessage("");
                          setOtpError("");
                        }}
                        className="text-brand-primary focus:ring-brand-primary"
                      />
                      <span>Mobile Number (SMS / WhatsApp)</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                      <input
                        type="radio"
                        checked={contactType === "email"}
                        onChange={() => {
                          setContactType("email");
                          setContactValue("");
                          setOtpValue("");
                          setOtpVerified(false);
                          setOtpMessage("");
                          setOtpError("");
                        }}
                        className="text-brand-primary focus:ring-brand-primary"
                      />
                      <span>Email Address</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-body-heading mb-1.5">
                    {contactType === "phone" ? "Mobile Number" : "Email Address"}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type={contactType === "phone" ? "tel" : "email"}
                      value={contactValue}
                      onChange={(e) => {
                        setContactValue(e.target.value);
                        setOtpVerified(false);
                      }}
                      placeholder={contactType === "phone" ? "+91 98765 43210" : "head@example.com"}
                      className="flex-1 px-4 py-2.5 rounded-xl border border-brand-accent/40 text-xs text-body-heading bg-canvas-warm/30 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={isSendingOtp}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold bg-canvas-warm text-brand-primary border border-brand-accent hover:bg-white transition-all shrink-0"
                    >
                      {isSendingOtp ? "Sending..." : "Send OTP"}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-body-heading mb-1.5">
                    Enter OTP Passcode
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={otpValue}
                      onChange={(e) => setOtpValue(e.target.value)}
                      placeholder="6-digit OTP"
                      className="flex-1 px-4 py-2.5 rounded-xl border border-brand-accent/40 text-xs font-mono text-body-heading bg-canvas-warm/30 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyOtp}
                      className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                        otpVerified
                          ? "bg-emerald-600 text-white"
                          : "bg-brand-primary text-white hover:bg-brand-burgundy"
                      }`}
                    >
                      {otpVerified ? "✓ Verified" : "Verify OTP"}
                    </button>
                  </div>

                  {otpMessage && (
                    <p className="text-[11px] font-semibold text-emerald-700 mt-2">
                      {otpMessage}
                    </p>
                  )}
                  {otpError && (
                    <p className="text-[11px] font-semibold text-red-700 mt-2">
                      {otpError}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setOtpVerified(true);
                    setStep(2);
                  }}
                  className="px-6 py-2.5 rounded-full text-xs font-bold text-white va-btn-maroon"
                >
                  Continue to Household Details →
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: HOUSEHOLD INFO */}
          {step === 2 && (
            <div>
              <h2 className="text-lg font-bold text-brand-primary mb-1">
                Step 2: Household & Ancestral Origin
              </h2>
              <p className="text-xs text-body-muted mb-6">
                Please provide your family&apos;s Gotra and ancestral native place.
              </p>

              <div className="space-y-4 mb-8">
                <div>
                  <label className="block text-xs font-bold text-body-heading mb-1.5">
                    Head of Household Full Name
                  </label>
                  <input
                    type="text"
                    value={headName}
                    onChange={(e) => setHeadName(e.target.value)}
                    placeholder="e.g. Rajesh Kumar Garg"
                    className="w-full px-4 py-2.5 rounded-xl border border-brand-accent/40 text-xs text-body-heading bg-canvas-warm/30 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-body-heading mb-1.5">
                    Gotra (18 गोत्र)
                  </label>
                  <select
                    value={gotra}
                    onChange={(e) => setGotra(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-brand-accent/40 text-xs font-semibold text-body-heading bg-canvas-warm/30 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  >
                    {gotras.map((g) => (
                      <option key={g.id} value={g.name}>
                        {g.name} ({g.devanagari})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-body-heading mb-1.5">
                    Ancestral Native Place (मूल निवास / पैतृक स्थान)
                  </label>
                  <input
                    type="text"
                    value={nativePlace}
                    onChange={(e) => setNativePlace(e.target.value)}
                    placeholder="e.g. Agroha, Hisar, Haryana / Fatehpur, Rajasthan"
                    className="w-full px-4 py-2.5 rounded-xl border border-brand-accent/40 text-xs text-body-heading bg-canvas-warm/30 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-5 py-2 rounded-full text-xs font-bold text-body-heading bg-canvas-warm hover:bg-white border border-brand-accent/30"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-6 py-2.5 rounded-full text-xs font-bold text-white va-btn-maroon"
                >
                  Continue to Family Members →
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: FAMILY MEMBERS */}
          {step === 3 && (
            <div>
              <div className="flex items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-lg font-bold text-brand-primary">
                    Step 3: Family Members ({members.length})
                  </h2>
                  <p className="text-xs text-body-muted">
                    Add family members one by one. You can edit each profile.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addMember}
                  className="px-4 py-2 rounded-full text-xs font-bold text-brand-primary bg-canvas-warm border border-brand-accent hover:bg-white transition-all shadow-sm"
                >
                  + Add Member
                </button>
              </div>

              <div className="space-y-6 mb-8">
                {members.map((m, idx) => (
                  <div
                    key={m.id}
                    className="p-5 rounded-2xl bg-canvas-warm/30 border border-brand-accent/30 relative"
                  >
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-brand-accent/20">
                      <span className="text-xs font-extrabold text-brand-primary">
                        Member #{idx + 1}: {m.fullName || "New Member"} (
                        {m.relationToHead})
                      </span>
                      {members.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeMember(m.id)}
                          className="text-[11px] font-bold text-red-700 hover:underline"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-body-heading mb-1">
                          Full Name
                        </label>
                        <input
                          type="text"
                          value={m.fullName}
                          onChange={(e) =>
                            updateMember(m.id, "fullName", e.target.value)
                          }
                          placeholder="Full Name"
                          className="w-full px-3 py-2 rounded-lg border border-brand-accent/40 text-xs bg-white focus:ring-1 focus:ring-brand-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-body-heading mb-1">
                          Relation to Head
                        </label>
                        <select
                          value={m.relationToHead}
                          onChange={(e) =>
                            updateMember(m.id, "relationToHead", e.target.value)
                          }
                          className="w-full px-3 py-2 rounded-lg border border-brand-accent/40 text-xs bg-white focus:ring-1 focus:ring-brand-primary"
                        >
                          <option value="self">Self (Head)</option>
                          <option value="spouse">Spouse</option>
                          <option value="son">Son</option>
                          <option value="daughter">Daughter</option>
                          <option value="parent">Parent</option>
                          <option value="other">Other</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-body-heading mb-1">
                          Exact Date of Birth
                        </label>
                        <input
                          type="date"
                          value={m.dob}
                          onChange={(e) =>
                            updateMember(m.id, "dob", e.target.value)
                          }
                          className="w-full px-3 py-2 rounded-lg border border-brand-accent/40 text-xs bg-white focus:ring-1 focus:ring-brand-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-body-heading mb-1">
                          Current City & Country
                        </label>
                        <input
                          type="text"
                          value={m.currentCity}
                          onChange={(e) =>
                            updateMember(m.id, "currentCity", e.target.value)
                          }
                          placeholder="e.g. New Delhi, India"
                          className="w-full px-3 py-2 rounded-lg border border-brand-accent/40 text-xs bg-white focus:ring-1 focus:ring-brand-primary"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold text-body-heading mb-1">
                          Profession / Business / Designation
                        </label>
                        <input
                          type="text"
                          value={m.profession}
                          onChange={(e) =>
                            updateMember(m.id, "profession", e.target.value)
                          }
                          placeholder="e.g. Textile Manufacturer / Software Engineer"
                          className="w-full px-3 py-2 rounded-lg border border-brand-accent/40 text-xs bg-white focus:ring-1 focus:ring-brand-primary"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-5 py-2 rounded-full text-xs font-bold text-body-heading bg-canvas-warm hover:bg-white border border-brand-accent/30"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="px-6 py-2.5 rounded-full text-xs font-bold text-white va-btn-maroon"
                >
                  Continue to Privacy Controls →
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: PRIVACY SETTINGS */}
          {step === 4 && (
            <div>
              <h2 className="text-lg font-bold text-brand-primary mb-1">
                Step 4: Field-Level Privacy Controls
              </h2>
              <p className="text-xs text-body-muted mb-6">
                Specify what other verified community members can see for each family member.
              </p>

              <div className="space-y-6 mb-8">
                {members.map((m) => (
                  <div
                    key={m.id}
                    className="p-5 rounded-2xl bg-canvas-warm/30 border border-brand-accent/30"
                  >
                    <h3 className="text-xs font-bold text-brand-primary mb-3">
                      Privacy for: <strong>{m.fullName || "Member"}</strong>
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                      <div>
                        <label className="block font-bold text-body-heading mb-1">
                          Phone & Email
                        </label>
                        <select
                          value={m.visibility.contactInfo}
                          onChange={(e) =>
                            updateVisibility(
                              m.id,
                              "contactInfo",
                              e.target.value as any
                            )
                          }
                          className="w-full px-3 py-2 rounded-lg border border-brand-accent/40 bg-white"
                        >
                          <option value="members_only">Members Only</option>
                          <option value="hidden">Hidden from All</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-body-heading mb-1">
                          Date of Birth
                        </label>
                        <select
                          value={m.visibility.dob}
                          onChange={(e) =>
                            updateVisibility(m.id, "dob", e.target.value as any)
                          }
                          className="w-full px-3 py-2 rounded-lg border border-brand-accent/40 bg-white"
                        >
                          <option value="hidden">Hidden (Show Age Only)</option>
                          <option value="members_only">Show Full DOB</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-body-heading mb-1">
                          Profile Photo
                        </label>
                        <select
                          value={m.visibility.photo}
                          onChange={(e) =>
                            updateVisibility(m.id, "photo", e.target.value as any)
                          }
                          className="w-full px-3 py-2 rounded-lg border border-brand-accent/40 bg-white"
                        >
                          <option value="public_to_members">Visible to Members</option>
                          <option value="hidden">Hidden</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-5 py-2 rounded-full text-xs font-bold text-body-heading bg-canvas-warm hover:bg-white border border-brand-accent/30"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(5)}
                  className="px-6 py-2.5 rounded-full text-xs font-bold text-white va-btn-maroon"
                >
                  Continue to Final Consent →
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: CONSENT & SUBMIT */}
          {step === 5 && (
            <div>
              <h2 className="text-lg font-bold text-brand-primary mb-1">
                Step 5: Consent & Submission
              </h2>
              <p className="text-xs text-body-muted mb-6">
                Review your household summary and confirm your consent.
              </p>

              <div className="p-5 rounded-2xl bg-canvas-warm/40 border border-brand-accent/30 mb-6 space-y-2 text-xs">
                <p>
                  <strong>Head of Household:</strong> {headName}
                </p>
                <p>
                  <strong>Gotra:</strong> {gotra}
                </p>
                <p>
                  <strong>Native Place:</strong> {nativePlace}
                </p>
                <p>
                  <strong>Total Registered Members:</strong> {members.length}
                </p>
                <p>
                  <strong>Verified Contact:</strong> {contactValue}
                </p>
              </div>

              <div className="p-4 rounded-xl border border-brand-accent bg-white mb-6">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consentGiven}
                    onChange={(e) => setConsentGiven(e.target.checked)}
                    className="mt-0.5 rounded text-brand-primary focus:ring-brand-primary"
                  />
                  <span className="text-xs text-body-text leading-relaxed">
                    I confirm that I have obtained explicit consent from all family members listed to register their information in the Global Agrawal Directory, and I agree to the{" "}
                    <Link href="/privacy" className="text-brand-primary underline font-bold" target="_blank">
                      Privacy Policy
                    </Link>{" "}
                    and{" "}
                    <Link href="/terms" className="text-brand-primary underline font-bold" target="_blank">
                      Terms of Service
                    </Link>.
                  </span>
                </label>
              </div>

              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="px-5 py-2 rounded-full text-xs font-bold text-body-heading bg-canvas-warm hover:bg-white border border-brand-accent/30"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  disabled={!consentGiven || isSubmitting}
                  onClick={handleFinalSubmit}
                  className={`px-8 py-3 rounded-full text-xs font-extrabold text-white shadow-goldCta transition-all ${
                    consentGiven && !isSubmitting
                      ? "va-btn-join cursor-pointer"
                      : "bg-gray-400 cursor-not-allowed opacity-60"
                  }`}
                >
                  {isSubmitting ? "Submitting..." : "Submit Household for Review →"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-xs text-body-muted">Loading registration wizard...</div>}>
      <SignupContent />
    </Suspense>
  );
}
