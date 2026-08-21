'use client';

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import WizardProgressBar from "@/components/wizard/WizardProgressBar";
import { gotras } from "@/data/gotras";
import { Household, Member } from "@/types/household";
import { registerHousehold, checkContactRegistration } from "@/actions/register";
import { sendOtp, verifyOtp } from "@/actions/otp";

function calculateAge(dobStr: string): number | null {
  if (!dobStr || !dobStr.trim()) return null;
  const birthDate = new Date(dobStr.trim());
  if (isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
}

function SignupContent() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [successCode, setSuccessCode] = useState("");

  // Step 1: Contact Verification State
  const [contactType, setContactType] = useState<"phone" | "email">("phone");
  const [contactValue, setContactValue] = useState("");
  const [otpValue, setOtpValue] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpMessage, setOtpMessage] = useState("");
  const [otpError, setOtpError] = useState("");
  const [alreadyRegisteredInfo, setAlreadyRegisteredInfo] = useState<{ isRegistered: boolean; householdCode?: string; headName?: string } | null>(null);

  // Step 2: Household Info State
  const [headName, setHeadName] = useState("");
  const [nativePlace, setNativePlace] = useState("");
  const [gotra, setGotra] = useState(gotras[0].name); // 'Garg' default
  const [step2Error, setStep2Error] = useState("");

  // Step 3: Family Members State
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
  const [step3Error, setStep3Error] = useState("");

  // Step 4 & 5 State
  const [consentGiven, setConsentGiven] = useState(false);

  // Synchronize head name with member[0]
  useEffect(() => {
    if (headName && members.length > 0) {
      setMembers((prev) => {
        const copy = [...prev];
        copy[0] = { ...copy[0], fullName: headName, currentCity: copy[0].currentCity || nativePlace };
        return copy;
      });
    }
  }, [headName, nativePlace]);

  // Step 1 Handlers
  const handleSendOtp = async () => {
    if (!contactValue.trim() || contactValue.trim().length < 5) {
      setOtpError(contactType === "phone" ? "Please enter a valid mobile number." : "Please enter a valid email address.");
      return;
    }

    setIsSendingOtp(true);
    setOtpError("");
    setOtpMessage("");
    setAlreadyRegisteredInfo(null);

    // 1. Check if number is already registered in directory
    const checkRes = await checkContactRegistration(contactValue);
    if (checkRes.isRegistered) {
      setIsSendingOtp(false);
      setAlreadyRegisteredInfo(checkRes);
      return;
    }

    // 2. Dispatch OTP
    const res = await sendOtp({ recipient: contactValue, type: contactType === "phone" ? "sms" : "email" });
    setIsSendingOtp(false);
    if (res.success) {
      setOtpMessage(res.message || "OTP passcode sent successfully.");
    } else {
      setOtpError(res.error || "Failed to send OTP.");
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpValue.trim() || otpValue.trim().length !== 6) {
      setOtpError("Please enter the 6-digit verification OTP.");
      return;
    }
    setIsVerifyingOtp(true);
    setOtpError("");
    setOtpMessage("");
    const res = await verifyOtp({ recipient: contactValue, otp: otpValue });
    setIsVerifyingOtp(false);
    if (res.success) {
      setOtpVerified(true);
      setOtpMessage("✓ Contact verified successfully! Auto-advancing...");
      setTimeout(() => {
        setStep(2);
      }, 400);
    } else {
      setOtpError(res.error || "Invalid OTP code.");
    }
  };

  // Step 2 Validation & Transition
  const handleStep2Next = () => {
    setStep2Error("");
    if (!headName.trim() || headName.trim().length < 2) {
      setStep2Error("Please enter the Head of Household's full name.");
      return;
    }
    if (!gotra.trim()) {
      setStep2Error("Please select your family's Gotra.");
      return;
    }
    if (!nativePlace.trim() || nativePlace.trim().length < 2) {
      setStep2Error("Please enter your ancestral native place (मूल निवास / पैतृक स्थान).");
      return;
    }
    setStep(3);
  };

  // Step 3 Helpers
  const addMember = () => {
    const newMember: Member = {
      id: `m-${Date.now()}`,
      fullName: "",
      relationToHead: "son",
      dob: "",
      gender: "Male",
      maritalStatus: "Unmarried",
      currentCity: nativePlace || "",
      currentCountry: "India",
      profession: "",
      verifiedBySelf: false,
      ownerLocked: false,
      visibility: {
        contactInfo: "members_only",
        dob: "hidden",
        photo: "public_to_members",
      },
    };
    setMembers([...members, newMember]);
  };

  const updateMember = (id: string, field: keyof Member, value: any) => {
    setMembers(
      members.map((m) => {
        if (m.id !== id) return m;
        const updated = { ...m, [field]: value };
        
        // Smart Minor Check: If DOB is entered and age < 18, lock maritalStatus to "Unmarried"
        if (field === "dob") {
          const age = calculateAge(value);
          if (age !== null && age < 18) {
            updated.maritalStatus = "Unmarried";
          }
        }
        return updated;
      })
    );
  };

  const updateVisibility = (
    memberId: string,
    field: "contactInfo" | "dob" | "photo",
    value: any
  ) => {
    setMembers(
      members.map((m) =>
        m.id === memberId ? { ...m, visibility: { ...m.visibility, [field]: value } } : m
      )
    );
  };

  const removeMember = (id: string) => {
    if (members.length <= 1) return;
    setMembers(members.filter((m) => m.id !== id));
  };

  const handleStep3Next = () => {
    setStep3Error("");
    for (let i = 0; i < members.length; i++) {
      if (!members[i].fullName?.trim() || members[i].fullName.trim().length < 2) {
        setStep3Error(`Please enter a valid full name for Member #${i + 1}.`);
        return;
      }
    }
    setStep(4);
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consentGiven) {
      alert("Please accept the community guidelines consent.");
      return;
    }
    setIsSubmitting(true);

    try {
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
        setSuccessCode(res.householdCode || "AGR-2026-LIVE");
        setIsSuccess(true);
      } else {
        alert(res.error || "Registration failed. Please check inputs.");
      }
    } catch (err: any) {
      setIsSubmitting(false);
      console.error("Submission error:", err);
      alert("Registration submission error. Please try again.");
    }
  };

  if (isSuccess) {
    return (
      <main className="py-12 sm:py-20 bg-canvas-page min-h-[70vh] flex items-center">
        <div className="max-w-xl mx-auto px-4 w-full text-center">
          <div className="bg-white border-2 border-brand-accent/40 rounded-3xl p-6 sm:p-12 shadow-warmLg">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-2xl sm:text-3xl font-bold mx-auto mb-4 border border-emerald-300">
              ✓
            </div>
            <span className="inline-block text-xs font-bold uppercase va-badge-pending px-3 py-1 rounded-full mb-3">
              Status: Under Review (Pending)
            </span>
            <h1 className="text-xl sm:text-3xl font-black text-brand-primary mb-3">
              Registration Submitted Successfully!
            </h1>
            <p className="text-xs sm:text-sm text-body-text leading-relaxed mb-6">
              Thank you for registering your family in the <strong>ANTARRASHTRIYA AGARWAL SAMAJ DIRECTORY</strong>. Your submission is now in the community moderation queue. Once approved by our team, your household profile will go live.
            </p>
            <div className="p-3 sm:p-4 rounded-xl bg-canvas-warm border border-brand-accent/30 text-xs font-mono text-brand-primary mb-6">
              Reference ID: <strong>#{successCode}</strong> • Gotra: <strong>{gotra}</strong>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/dashboard"
                className="w-full sm:w-auto px-6 py-3 rounded-full text-xs font-bold text-white va-btn-maroon"
              >
                Go to Household Dashboard →
              </Link>
              <Link
                href="/directory"
                className="w-full sm:w-auto px-6 py-3 rounded-full text-xs font-bold text-brand-primary bg-canvas-warm border border-brand-accent hover:bg-white"
              >
                Browse Directory
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="py-6 sm:py-12 bg-canvas-page">
      <div className="max-w-3xl mx-auto px-4">
        {/* Wizard Header */}
        <div className="text-center mb-6 sm:mb-8">
          <span className="text-xs font-bold uppercase va-badge-gold px-3 py-1 rounded-full mb-2 inline-block">
            Step-by-Step Registration • नि:शुल्क पंजीकरण
          </span>
          <h1 className="text-xl sm:text-3xl font-black text-brand-primary">
            Register Your Family Household
          </h1>
          <p className="text-xs sm:text-sm text-body-muted mt-1">
            Free forever • Trusted verification • 18 Gotras lineage • Privacy-first
          </p>
        </div>

        {/* Dynamic Progress Bar */}
        <WizardProgressBar currentStep={step} totalSteps={5} />

        {/* Wizard Step Container */}
        <div className="bg-white border border-brand-accent/30 rounded-3xl p-5 sm:p-8 shadow-warm">
          {/* STEP 1: CONTACT VERIFICATION */}
          {step === 1 && (
            <div>
              <h2 className="text-base sm:text-lg font-bold text-brand-primary mb-1">
                Step 1: Verify Head of Household Contact
              </h2>
              <p className="text-xs text-body-muted mb-6">
                Your mobile number or email is used for one-time verification and secure access.
              </p>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-bold text-body-heading mb-1.5">
                    Verification Method
                  </label>
                  <div className="flex flex-wrap gap-4 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="contactType"
                        checked={contactType === "phone"}
                        onChange={() => {
                          setContactType("phone");
                          setContactValue("");
                          setOtpValue("");
                          setOtpVerified(false);
                          setOtpMessage("");
                          setOtpError("");
                          setAlreadyRegisteredInfo(null);
                        }}
                        className="text-brand-primary focus:ring-brand-primary"
                      />
                      <span>Mobile Number (WhatsApp)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="contactType"
                        checked={contactType === "email"}
                        onChange={() => {
                          setContactType("email");
                          setContactValue("");
                          setOtpValue("");
                          setOtpVerified(false);
                          setOtpMessage("");
                          setOtpError("");
                          setAlreadyRegisteredInfo(null);
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
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type={contactType === "phone" ? "tel" : "email"}
                      value={contactValue}
                      onChange={(e) => {
                        setContactValue(e.target.value);
                        setOtpVerified(false);
                        setOtpError("");
                        setAlreadyRegisteredInfo(null);
                      }}
                      placeholder={contactType === "phone" ? "+91 98765 43210" : "head@example.com"}
                      className="w-full sm:flex-1 px-4 py-2.5 rounded-xl border border-brand-accent/40 text-xs text-body-heading bg-canvas-warm/30 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={isSendingOtp}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold bg-canvas-warm text-brand-primary border border-brand-accent hover:bg-white transition-all shrink-0"
                    >
                      {isSendingOtp ? "Checking..." : "Send OTP"}
                    </button>
                  </div>
                </div>

                {/* ALREADY REGISTERED BANNER & REDIRECT CTA */}
                {alreadyRegisteredInfo && (
                  <div className="p-4 rounded-2xl bg-amber-50 border-2 border-brand-gold/50 space-y-3 animate-in fade-in">
                    <div className="flex items-start gap-3">
                      <span className="text-xl">🏡</span>
                      <div>
                        <h4 className="text-xs font-bold text-brand-primary">
                          This {contactType === "phone" ? "number" : "email"} is already registered!
                        </h4>
                        <p className="text-[11px] text-body-muted mt-0.5">
                          A household profile {alreadyRegisteredInfo.headName && `(${alreadyRegisteredInfo.headName})`} under reference ID <strong>#{alreadyRegisteredInfo.householdCode}</strong> already exists in the Global Directory.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 pt-1">
                      <Link
                        href={`/login`}
                        className="px-5 py-2.5 rounded-xl text-xs font-bold text-white va-btn-join text-center shadow-sm"
                      >
                        Sign In to Your Household Dashboard →
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setContactValue("");
                          setAlreadyRegisteredInfo(null);
                        }}
                        className="px-4 py-2.5 rounded-xl text-xs font-semibold text-body-muted hover:text-brand-primary bg-white border border-brand-accent/30 text-center"
                      >
                        Use a Different Number
                      </button>
                    </div>
                  </div>
                )}

                {!alreadyRegisteredInfo && (
                  <div>
                    <label className="block text-xs font-bold text-body-heading mb-1.5">
                      Enter 6-Digit OTP Passcode
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        maxLength={6}
                        value={otpValue}
                        onChange={(e) => setOtpValue(e.target.value)}
                        placeholder="6-digit OTP code"
                        className="w-full sm:flex-1 px-4 py-2.5 rounded-xl border border-brand-accent/40 text-xs font-mono text-body-heading bg-canvas-warm/30 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                      />
                      <button
                        type="button"
                        onClick={handleVerifyOtp}
                        disabled={isVerifyingOtp}
                        className={`w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                          otpVerified
                            ? "bg-emerald-600 text-white"
                            : "bg-brand-primary text-white hover:bg-brand-burgundy"
                        }`}
                      >
                        {isVerifyingOtp ? "Verifying..." : (otpVerified ? "✓ Verified" : "Verify OTP")}
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
                )}
              </div>

              {!alreadyRegisteredInfo && (
                <div className="flex justify-end pt-4 border-t border-brand-accent/20">
                  <button
                    type="button"
                    onClick={() => {
                      if (!otpVerified && !contactValue) {
                        setOtpError("Please verify your mobile number or email before continuing.");
                        return;
                      }
                      setStep(2);
                    }}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-full text-xs font-bold text-white va-btn-maroon"
                  >
                    Continue to Household Details →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: HOUSEHOLD & GOTRA INFO */}
          {step === 2 && (
            <div>
              <h2 className="text-base sm:text-lg font-bold text-brand-primary mb-1">
                Step 2: Household & Ancestral Origin
              </h2>
              <p className="text-xs text-body-muted mb-6">
                Please provide your family&apos;s Gotra and ancestral native place.
              </p>

              {step2Error && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
                  ⚠️ {step2Error}
                </div>
              )}

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-bold text-body-heading mb-1.5">
                    Head of Household Full Name *
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
                    Gotra (18 गोत्र) *
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
                  <span className="text-[11px] text-body-muted block mt-1">
                    Selected Gotra: <strong>{gotra}</strong>
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-body-heading mb-1.5">
                    Ancestral Native Place (मूल निवास / पैतृक स्थान) *
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

              <div className="flex flex-col-reverse sm:flex-row justify-between gap-3 pt-4 border-t border-brand-accent/20">
                <span className="text-[11px] font-bold text-brand-primary flex items-center gap-1">
                  🔒 Contact: {contactValue || "Verified"}
                </span>
                <button
                  type="button"
                  onClick={handleStep2Next}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-full text-xs font-bold text-white va-btn-maroon"
                >
                  Continue to Family Members →
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: FAMILY MEMBERS */}
          {step === 3 && (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-brand-primary mb-0.5">
                    Step 3: Family Members
                  </h2>
                  <p className="text-xs text-body-muted">
                    Add yourself and family members in your household.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addMember}
                  className="w-full sm:w-auto px-4 py-2 rounded-full text-xs font-bold text-brand-primary bg-canvas-warm border border-brand-accent hover:bg-white transition-all self-start"
                >
                  + Add Another Member
                </button>
              </div>

              {step3Error && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
                  ⚠️ {step3Error}
                </div>
              )}

              <div className="space-y-4 mb-6">
                {members.map((member, index) => {
                  const calculatedAge = calculateAge(member.dob);
                  const isMinor = calculatedAge !== null && calculatedAge < 18;

                  return (
                    <div
                      key={member.id}
                      className="p-4 sm:p-5 rounded-2xl border border-brand-accent/30 bg-canvas-warm/20 relative"
                    >
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-brand-accent/20">
                        <span className="text-xs font-bold text-brand-primary">
                          Member #{index + 1} {index === 0 && "(Head of Household)"}
                        </span>
                        {index > 0 && (
                          <button
                            type="button"
                            onClick={() => removeMember(member.id)}
                            className="text-xs font-semibold text-red-600 hover:text-red-800"
                          >
                            ✕ Remove
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {/* 1. Full Name */}
                        <div>
                          <label className="block text-[11px] font-bold text-body-heading mb-1">
                            Full Name *
                          </label>
                          <input
                            type="text"
                            value={member.fullName}
                            onChange={(e) => updateMember(member.id, "fullName", e.target.value)}
                            placeholder="e.g. Rahul Garg"
                            className="w-full px-3 py-2 rounded-lg border border-brand-accent/40 text-xs bg-white focus:ring-1 focus:ring-brand-primary"
                          />
                        </div>

                        {/* 2. Relation */}
                        <div>
                          <label className="block text-[11px] font-bold text-body-heading mb-1">
                            Relation to Head
                          </label>
                          <select
                            value={member.relationToHead}
                            disabled={index === 0}
                            onChange={(e) => updateMember(member.id, "relationToHead", e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-brand-accent/40 text-xs bg-white focus:ring-1 focus:ring-brand-primary"
                          >
                            <option value="self">Self (Head)</option>
                            <option value="spouse">Spouse</option>
                            <option value="son">Son</option>
                            <option value="daughter">Daughter</option>
                            <option value="father">Father</option>
                            <option value="mother">Mother</option>
                            <option value="brother">Brother</option>
                            <option value="sister">Sister</option>
                            <option value="daughter_in_law">Daughter-in-law</option>
                            <option value="son_in_law">Son-in-law</option>
                            <option value="grandson">Grandson</option>
                            <option value="granddaughter">Granddaughter</option>
                            <option value="other">Other Relative</option>
                          </select>
                        </div>

                        {/* 3. Date of Birth Date Picker */}
                        <div>
                          <label className="block text-[11px] font-bold text-body-heading mb-1">
                            Date of Birth (जन्म तिथि)
                          </label>
                          <input
                            type="date"
                            max={new Date().toISOString().split("T")[0]}
                            min="1910-01-01"
                            value={member.dob}
                            onChange={(e) => updateMember(member.id, "dob", e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-brand-accent/40 text-xs bg-white text-body-heading focus:ring-1 focus:ring-brand-primary"
                          />
                          {calculatedAge !== null && (
                            <span className="text-[10px] text-brand-gold font-semibold block mt-0.5">
                              Age: {calculatedAge} yrs {isMinor ? "• Minor (<18)" : "• Adult"}
                            </span>
                          )}
                        </div>

                        {/* 4. Gender */}
                        <div>
                          <label className="block text-[11px] font-bold text-body-heading mb-1">
                            Gender
                          </label>
                          <select
                            value={member.gender}
                            onChange={(e) => updateMember(member.id, "gender", e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-brand-accent/40 text-xs bg-white focus:ring-1 focus:ring-brand-primary"
                          >
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>

                        {/* 5. Marital Status (Smart Minor Check) */}
                        <div>
                          <label className="block text-[11px] font-bold text-body-heading mb-1">
                            Marital Status
                          </label>
                          {isMinor ? (
                            <div className="w-full px-3 py-2 rounded-lg border border-brand-accent/20 text-xs bg-gray-100 text-body-muted font-semibold">
                              Unmarried (Age &lt; 18)
                            </div>
                          ) : (
                            <select
                              value={member.maritalStatus}
                              onChange={(e) => updateMember(member.id, "maritalStatus", e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border border-brand-accent/40 text-xs bg-white focus:ring-1 focus:ring-brand-primary"
                            >
                              <option value="Married">Married</option>
                              <option value="Unmarried">Unmarried</option>
                              <option value="Widowed">Widowed</option>
                              <option value="Divorced">Divorced</option>
                            </select>
                          )}
                        </div>

                        {/* 6. Current City */}
                        <div>
                          <label className="block text-[11px] font-bold text-body-heading mb-1">
                            Current City
                          </label>
                          <input
                            type="text"
                            value={member.currentCity}
                            onChange={(e) => updateMember(member.id, "currentCity", e.target.value)}
                            placeholder="e.g. New Delhi"
                            className="w-full px-3 py-2 rounded-lg border border-brand-accent/40 text-xs bg-white focus:ring-1 focus:ring-brand-primary"
                          />
                        </div>

                        {/* 7. Profession */}
                        <div className="sm:col-span-2 lg:col-span-3">
                          <label className="block text-[11px] font-bold text-body-heading mb-1">
                            Profession / Occupation / Education
                          </label>
                          <input
                            type="text"
                            value={member.profession}
                            onChange={(e) => updateMember(member.id, "profession", e.target.value)}
                            placeholder={isMinor ? "e.g. Student / Class 10" : "e.g. Chartered Accountant / Business Owner"}
                            className="w-full px-3 py-2 rounded-lg border border-brand-accent/40 text-xs bg-white focus:ring-1 focus:ring-brand-primary"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-between gap-3 pt-4 border-t border-brand-accent/20">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-full text-xs font-bold text-body-heading bg-canvas-warm hover:bg-white border border-brand-accent/30"
                >
                  ← Back to Origin
                </button>
                <button
                  type="button"
                  onClick={handleStep3Next}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-full text-xs font-bold text-white va-btn-maroon"
                >
                  Continue to Privacy Preferences →
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: PRIVACY PREFERENCES */}
          {step === 4 && (
            <div>
              <h2 className="text-base sm:text-lg font-bold text-brand-primary mb-1">
                Step 4: Privacy & Visibility Controls
              </h2>
              <p className="text-xs text-body-muted mb-6">
                Configure privacy visibility levels for each family member in the directory.
              </p>

              <div className="space-y-4 mb-6">
                {members.map((member, idx) => (
                  <div
                    key={member.id}
                    className="p-4 sm:p-5 rounded-2xl border border-brand-accent/30 bg-canvas-warm/20 space-y-3"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-brand-accent/20">
                      <span className="text-xs font-bold text-brand-primary">
                        {member.fullName || `Member #${idx + 1}`} ({member.relationToHead})
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-body-heading mb-1">
                          Contact Info Visibility
                        </label>
                        <select
                          value={member.visibility.contactInfo}
                          onChange={(e) => updateVisibility(member.id, "contactInfo", e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-brand-accent/40 text-xs bg-white"
                        >
                          <option value="members_only">Verified Members Only (Recommended)</option>
                          <option value="hidden">Hidden from Everyone</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-body-heading mb-1">
                          Date of Birth Visibility
                        </label>
                        <select
                          value={member.visibility.dob}
                          onChange={(e) => updateVisibility(member.id, "dob", e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-brand-accent/40 text-xs bg-white"
                        >
                          <option value="hidden">Hidden (Age Bracket Only)</option>
                          <option value="members_only">Verified Members Only</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-between gap-3 pt-4 border-t border-brand-accent/20">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-full text-xs font-bold text-body-heading bg-canvas-warm hover:bg-white border border-brand-accent/30"
                >
                  ← Back to Members
                </button>
                <button
                  type="button"
                  onClick={() => setStep(5)}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-full text-xs font-bold text-white va-btn-maroon"
                >
                  Review & Submit →
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: REVIEW & CONSENT */}
          {step === 5 && (
            <div>
              <h2 className="text-base sm:text-lg font-bold text-brand-primary mb-1">
                Step 5: Consent & Final Submission
              </h2>
              <p className="text-xs text-body-muted mb-6">
                Please review your registration details and accept the community consent agreement.
              </p>

              {/* Summary Review Card */}
              <div className="p-4 sm:p-5 rounded-2xl border border-brand-accent/30 bg-canvas-warm/40 mb-6 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-body-muted block text-[11px]">Head of Household:</span>
                    <strong className="text-brand-primary">{headName}</strong>
                  </div>
                  <div>
                    <span className="text-body-muted block text-[11px]">Gotra (गोत्र):</span>
                    <strong className="text-brand-primary">{gotra}</strong>
                  </div>
                  <div>
                    <span className="text-body-muted block text-[11px]">Native Place (मूल निवास):</span>
                    <strong className="text-brand-primary">{nativePlace}</strong>
                  </div>
                  <div>
                    <span className="text-body-muted block text-[11px]">Verified Contact:</span>
                    <strong className="text-brand-primary">{contactValue}</strong>
                  </div>
                </div>

                <div className="pt-3 border-t border-brand-accent/20">
                  <span className="text-body-muted block text-[11px] mb-1">Registered Family Members ({members.length}):</span>
                  <div className="flex flex-wrap gap-1.5">
                    {members.map((m, idx) => (
                      <span key={m.id} className="text-[11px] font-semibold bg-white border border-brand-accent/30 px-2.5 py-1 rounded-full text-body-heading">
                        {m.fullName || `Member #${idx + 1}`} ({m.relationToHead}) {m.dob && `• ${m.dob}`}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Consent Checkbox */}
              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 mb-6">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consentGiven}
                    onChange={(e) => setConsentGiven(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-brand-primary focus:ring-brand-primary"
                  />
                  <span className="text-xs text-amber-950 leading-relaxed">
                    I confirm that I am authorized to register these details for my family in the <strong>ANTARRASHTRIYA AGARWAL SAMAJ DIRECTORY</strong>, and I agree to the community <Link href="/terms" className="underline font-bold">Terms of Service</Link> and <Link href="/privacy" className="underline font-bold">Privacy Policy</Link>.
                  </span>
                </label>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-between gap-3 pt-4 border-t border-brand-accent/20">
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-full text-xs font-bold text-body-heading bg-canvas-warm hover:bg-white border border-brand-accent/30"
                >
                  ← Back to Privacy
                </button>
                <button
                  type="button"
                  onClick={handleFinalSubmit}
                  disabled={!consentGiven || isSubmitting}
                  className={`w-full sm:w-auto px-8 py-3 rounded-full text-xs font-bold text-white transition-all shadow-goldCta ${
                    consentGiven && !isSubmitting ? "va-btn-join" : "bg-gray-400 cursor-not-allowed opacity-60"
                  }`}
                >
                  {isSubmitting ? "Submitting Registration..." : "Submit Household Registration ✓"}
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
    <Suspense fallback={<div className="p-12 text-center text-xs font-bold">Loading Registration Portal...</div>}>
      <SignupContent />
    </Suspense>
  );
}