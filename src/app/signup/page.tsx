'use client';

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import WizardProgressBar from "@/components/wizard/WizardProgressBar";
import { gotras } from "@/data/gotras";
import { Member } from "@/types/household";
import { registerHousehold, checkContactRegistration } from "@/actions/register";
import { checkContactAvailability } from "@/actions/claim";
import { sendOtp, verifyOtp } from "@/actions/otp";
import { getSession, clearSession } from "@/actions/auth";
import LocationSelector from "@/components/LocationSelector";

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

function maskPhone(phone?: string): string {
  if (!phone) return "Not provided";
  const clean = phone.trim();
  if (clean.length <= 4) return "••••";
  return clean.slice(0, 3) + " •••••• " + clean.slice(-4);
}

function maskEmail(email?: string): string {
  if (!email || !email.includes("@")) return "Not provided";
  const [local, domain] = email.split("@");
  if (local.length <= 2) return `${local.slice(0, 1)}••••@${domain}`;
  return `${local.slice(0, 1)}••••${local.slice(-1)}@${domain}`;
}

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialContact = searchParams.get("contact") || "";

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [successCode, setSuccessCode] = useState("");
  const [currentSession, setCurrentSession] = useState<any>(null);

  // Check if session exists to display top notice
  useEffect(() => {
    async function loadAuth() {
      const session = await getSession();
      if (session) {
        setCurrentSession(session);
      }
    }
    loadAuth();
  }, []);

  // Step 1: Contact Verification State
  const [contactType, setContactType] = useState<"phone" | "email">(
    initialContact && initialContact.includes("@") ? "email" : "phone"
  );
  const [contactValue, setContactValue] = useState(initialContact);
  const [phoneDialCode, setPhoneDialCode] = useState("+91");
  const [otpValue, setOtpValue] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpMessage, setOtpMessage] = useState("");
  const [otpError, setOtpError] = useState("");
  const [alreadyRegisteredInfo, setAlreadyRegisteredInfo] = useState<{ isRegistered: boolean; householdCode?: string; headName?: string } | null>(null);

  useEffect(() => {
    if (initialContact && !contactValue) {
      setContactValue(initialContact);
      setContactType(initialContact.includes("@") ? "email" : "phone");
    }
  }, [initialContact]);

  // Step 2: Gotra, Native Place & Address State
  const [headName, setHeadName] = useState("");
  const [gotra, setGotra] = useState(gotras[0].name); // 'Garg' default
  const [nativePlace, setNativePlace] = useState("");
  const [country, setCountry] = useState("India");
  const [postalCode, setPostalCode] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [fullAddress, setFullAddress] = useState("");
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [panNumber, setPanNumber] = useState("");
  const [passportNumber, setPassportNumber] = useState("");
  const [govtIdNumber, setGovtIdNumber] = useState("");
  const [step2Error, setStep2Error] = useState("");

  const isIndia = country.toLowerCase() === "india" || country.toUpperCase() === "IN";

  // Step 3: Family Members State
  const [members, setMembers] = useState<Member[]>([
    {
      id: "m-1",
      fullName: "",
      relationToHead: "self",
      fatherName: "",
      photoUrl: "",
      phone: "",
      email: "",
      dob: "",
      gender: "Male",
      maritalStatus: "Married",
      currentCity: "",
      currentCountry: "India",
      profession: "",
      professionTitle: "",
      professionDescription: "",
      verifiedBySelf: true,
      ownerLocked: true,
      visibility: {
        contactInfo: "hidden",
        dob: "hidden",
        photo: "public_to_members",
      },
    },
  ]);
  const [step3Error, setStep3Error] = useState("");
  const [contactFieldErrors, setContactFieldErrors] = useState<{ [key: string]: string }>({});

  // Step 4: Consent State
  const [consentGiven, setConsentGiven] = useState(false);

  // Synchronize head name, address, and contact with member[0]
  useEffect(() => {
    if (members.length > 0) {
      setMembers((prev) => {
        const copy = [...prev];
        const headPhone = contactType === "phone" ? contactValue : (copy[0].phone || "");
        const headEmail = contactType === "email" ? contactValue : (copy[0].email || "");
        copy[0] = {
          ...copy[0],
          fullName: headName || copy[0].fullName,
          currentCity: city || copy[0].currentCity || nativePlace,
          currentCountry: country || copy[0].currentCountry,
          postalCode: postalCode || copy[0].postalCode,
          state: state || copy[0].state,
          fullAddress: fullAddress || copy[0].fullAddress,
          phone: headPhone,
          email: headEmail,
          aadhaarNumber: isIndia ? aadhaarNumber : undefined,
          panNumber: isIndia ? panNumber : undefined,
          passportNumber: !isIndia ? passportNumber : undefined,
          govtIdNumber: !isIndia ? govtIdNumber : undefined,
        };
        return copy;
      });
    }
  }, [headName, nativePlace, country, postalCode, state, city, fullAddress, aadhaarNumber, panNumber, passportNumber, govtIdNumber, contactValue, contactType, isIndia]);

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
      setOtpError("This mobile/email is already registered! Redirecting to Member Login...");
      setTimeout(() => {
        router.push(`/login?contact=${encodeURIComponent(contactValue.trim())}`);
      }, 1500);
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
      setStep2Error("Please select your family's Gotra from the 18 established Gotras.");
      return;
    }
    if (!nativePlace.trim() || nativePlace.trim().length < 2) {
      setStep2Error("Please enter your ancestral native place (मूल निवास / पैतृक स्थान).");
      return;
    }
    if (!postalCode.trim() || postalCode.trim().length < 3) {
      setStep2Error("Please enter a valid Postal / PIN Code.");
      return;
    }
    if (!city.trim() || city.trim().length < 2) {
      setStep2Error("Please select or enter your City / District.");
      return;
    }
    if (!fullAddress.trim() || fullAddress.trim().length < 5) {
      setStep2Error("Please enter your complete residential address.");
      return;
    }

    if (isIndia) {
      const cleanAadhaar = aadhaarNumber.replace(/[^0-9]/g, "");
      if (cleanAadhaar.length !== 12) {
        setStep2Error("Please enter a valid 12-digit Aadhaar Number (आधार नंबर).");
        return;
      }
      const cleanPan = panNumber.trim().toUpperCase();
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleanPan)) {
        setStep2Error("Please enter a valid 10-character PAN Number (e.g. ABCDE1234F).");
        return;
      }
    } else {
      if (!passportNumber.trim() || passportNumber.trim().length < 5) {
        setStep2Error("Please enter a valid Passport Number.");
        return;
      }
      if (!govtIdNumber.trim() || govtIdNumber.trim().length < 3) {
        setStep2Error("Please enter a valid Government-Issued ID or Tax ID.");
        return;
      }
    }

    setStep(3);
  };

  // Step 3 Helpers
  const addMember = () => {
    const newMember: Member = {
      id: `m-${Date.now()}`,
      fullName: "",
      relationToHead: "son",
      fatherName: "",
      photoUrl: "",
      phone: "",
      email: "",
      dob: "",
      gender: "Male",
      maritalStatus: "Unmarried",
      currentCity: city || nativePlace || "",
      currentCountry: country || "India",
      postalCode: postalCode || "",
      state: state || "",
      fullAddress: fullAddress || "",
      profession: "",
      professionTitle: "",
      professionDescription: "",
      verifiedBySelf: false,
      ownerLocked: false,
      visibility: {
        contactInfo: "hidden",
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

  const removeMember = (id: string) => {
    if (members.length <= 1) return;
    setMembers(members.filter((m) => m.id !== id));
  };

  const handlePhotoUpload = (memberId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("Please select an image smaller than 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      const dataUrl = loadEvt.target?.result as string;
      updateMember(memberId, "photoUrl", dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const checkContactField = async (memberId: string, field: "phone" | "email", val: string) => {
    const key = `${memberId}_${field}`;
    const clean = val.trim();
    if (!clean || clean.length < 5) {
      setContactFieldErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      return;
    }

    const avail = await checkContactAvailability(clean, memberId);
    if (!avail.available && avail.conflict) {
      setContactFieldErrors((prev) => ({
        ...prev,
        [key]: `This ${field} is already registered (${avail.conflict?.name ? `under ${avail.conflict.name}` : `#${avail.conflict?.householdCode}`}).`,
      }));
    } else {
      setContactFieldErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const handleStep3Next = async () => {
    setStep3Error("");
    for (let i = 0; i < members.length; i++) {
      if (!members[i].fullName?.trim() || members[i].fullName.trim().length < 2) {
        setStep3Error(`Please enter a valid full name for Member #${i + 1}.`);
        return;
      }
      if (!members[i].dob?.trim()) {
        setStep3Error(`Please select the Date of Birth for Member #${i + 1} (${members[i].fullName || 'Member'}).`);
        return;
      }
    }

    // Head of Household mandatory validations
    const head = members[0];
    if (!head.fatherName?.trim() || head.fatherName.trim().length < 2) {
      setStep3Error("Father's Full Name (पिता का नाम) is required for Head of Household.");
      return;
    }

    const headPhone = (contactType === "phone" ? contactValue : head.phone)?.trim();
    if (!headPhone || headPhone.replace(/[^0-9]/g, "").length < 7) {
      setStep3Error("A valid Mobile Phone number is required for Head of Household.");
      return;
    }

    const headEmail = (contactType === "email" ? contactValue : head.email)?.trim();
    if (!headEmail || !headEmail.includes("@") || headEmail.length < 5) {
      setStep3Error("A valid Email Address is required for Head of Household.");
      return;
    }

    if (!head.profession?.trim()) {
      setStep3Error("Please specify the profession or occupation for Head of Household.");
      return;
    }

    // Check for any active contact duplicate errors
    const errorKeys = Object.keys(contactFieldErrors);
    if (errorKeys.length > 0) {
      setStep3Error("Please correct the duplicate mobile number or email before continuing.");
      return;
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

    const payloadMembers = members.map((m, idx) => {
      if (idx === 0) {
        return {
          ...m,
          phone: contactType === "phone" ? contactValue : (m.phone || "").trim(),
          email: contactType === "email" ? contactValue : (m.email || "").trim(),
          fatherName: (m.fatherName || "").trim(),
          photoUrl: m.photoUrl || undefined,
          professionTitle: m.professionTitle?.trim() || m.profession?.trim(),
          professionDescription: m.professionDescription?.trim() || undefined,
        };
      }
      return {
        ...m,
        phone: m.phone ? m.phone.trim() : undefined,
        email: m.email ? m.email.trim() : undefined,
        fatherName: m.fatherName ? m.fatherName.trim() : undefined,
        photoUrl: m.photoUrl || undefined,
        professionTitle: m.professionTitle?.trim() || m.profession?.trim(),
        professionDescription: m.professionDescription?.trim() || undefined,
      };
    });

    try {
      const res = await registerHousehold({
        headName,
        verifiedContact: contactValue,
        gotra,
        nativePlace,
        country,
        postalCode,
        state,
        city,
        fullAddress,
        aadhaarNumber: isIndia ? aadhaarNumber : undefined,
        panNumber: isIndia ? panNumber : undefined,
        passportNumber: !isIndia ? passportNumber : undefined,
        govtIdNumber: !isIndia ? govtIdNumber : undefined,
        members: payloadMembers,
        consentAccepted: consentGiven,
      });

      setIsSubmitting(false);
      if (res.success) {
        setSuccessCode(res.serialNo || res.householdCode || "MAFL-000-000-000");
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
              Status: Under Review (Pending Moderation)
            </span>
            <h1 className="text-xl sm:text-3xl font-black text-brand-primary mb-3">
              Registration Submitted Successfully!
            </h1>
            <p className="text-xs sm:text-sm text-body-text leading-relaxed mb-6">
              Thank you for registering your family under the <strong>Maharaja Agrasen Foundation Limited Singapore</strong> platform. Your submission is now in the community moderation queue.
            </p>
            
            <div className="p-4 sm:p-5 rounded-2xl bg-canvas-warm border-2 border-brand-accent/40 text-xs font-mono text-brand-primary mb-6 space-y-1">
              <span className="text-[10px] uppercase font-bold text-body-muted tracking-wider block">Assigned Serial Number</span>
              <div className="text-xl sm:text-2xl font-black text-brand-primary tracking-widest">{successCode}</div>
              <div className="text-[11px] text-body-muted font-sans mt-1">Gotra: <strong>{gotra}</strong> • Head: <strong>{headName}</strong></div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/dashboard"
                className="w-full sm:w-auto px-6 py-3 rounded-full text-xs font-bold text-white va-btn-maroon shadow-md"
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
            Official Lineage Registry • 18 Gotras • Privacy-Protected Contacts
          </p>
        </div>

        {/* Active Session Notice Banner */}
        {currentSession && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-brand-accent/40 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in">
            <div className="text-xs text-brand-primary text-center sm:text-left">
              <span>You are currently signed in as <strong>{currentSession.contact}</strong>.</span>
              <span className="block text-[11px] text-body-muted mt-0.5">
                Registering below will create a new family record and switch your active login session.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link href="/dashboard" className="px-4 py-1.5 rounded-full text-xs font-bold text-white va-btn-join shadow-sm">
                Go to Dashboard →
              </Link>
              <button
                type="button"
                onClick={async () => {
                  await clearSession();
                  setCurrentSession(null);
                }}
                className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-body-muted hover:text-red-700 bg-white border border-brand-accent/30"
              >
                Sign Out
              </button>
            </div>
          </div>
        )}

        {/* Dynamic 4-Step Progress Bar */}
        <WizardProgressBar currentStep={step} totalSteps={4} />

        {/* Wizard Step Container */}
        <div className="bg-white border border-brand-accent/30 rounded-3xl p-5 sm:p-8 shadow-warm">
          
          {/* STEP 1: CONTACT VERIFICATION */}
          {step === 1 && (
            <div>
              <h2 className="text-base sm:text-lg font-bold text-brand-primary mb-1">
                Step 1: Verify Head of Household Contact
              </h2>
              <p className="text-xs text-body-muted mb-6">
                Your mobile number or email is used for one-time verification and secure authentication.
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
                      <span>Mobile Number (SMS / WhatsApp)</span>
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
                    {contactType === "phone" ? "Mobile Number with Country Code" : "Email Address"}
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
                      placeholder={contactType === "phone" ? `${phoneDialCode} 98765 43210` : "head@example.com"}
                      className="w-full sm:flex-1 px-4 py-2.5 rounded-xl border border-brand-accent/40 text-xs text-body-heading bg-canvas-warm/30 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={isSendingOtp}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold bg-canvas-warm text-brand-primary border border-brand-accent hover:bg-white transition-all shrink-0"
                    >
                      {isSendingOtp ? "Sending..." : "Send OTP Passcode"}
                    </button>
                  </div>
                </div>

                {/* ALREADY REGISTERED BANNER */}
                {alreadyRegisteredInfo && (
                  <div className="p-4 rounded-2xl bg-amber-50 border-2 border-brand-gold/50 space-y-3 animate-in fade-in">
                    <div className="flex items-start gap-3">
                      <span className="text-xl">🏡</span>
                      <div>
                        <h4 className="text-xs font-bold text-brand-primary">
                          This {contactType === "phone" ? "number" : "email"} is already registered!
                        </h4>
                        <p className="text-[11px] text-body-muted mt-0.5">
                          A household profile {alreadyRegisteredInfo.headName && `(${alreadyRegisteredInfo.headName})`} under reference <strong>#{alreadyRegisteredInfo.householdCode}</strong> already exists in the Global Directory.
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
                    </div>
                  </div>
                )}

                {/* OTP Error or Success Messages */}
                {otpMessage && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
                    {otpMessage}
                  </div>
                )}
                {otpError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
                    ⚠️ {otpError}
                  </div>
                )}

                {/* OTP Passcode Input */}
                <div className="pt-2">
                  <label className="block text-xs font-bold text-body-heading mb-1.5">
                    Enter 6-Digit OTP Passcode
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      value={otpValue}
                      onChange={(e) => setOtpValue(e.target.value.replace(/[^0-9]/g, ""))}
                      placeholder="e.g. 123456"
                      className="w-full sm:flex-1 px-4 py-2.5 rounded-xl border border-brand-accent/40 text-xs tracking-widest font-mono text-body-heading bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyOtp}
                      disabled={isVerifyingOtp || otpValue.length !== 6}
                      className={`w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold text-white transition-all shrink-0 ${
                        otpValue.length === 6 && !isVerifyingOtp
                          ? "va-btn-join"
                          : "bg-gray-400 opacity-60 cursor-not-allowed"
                      }`}
                    >
                      {isVerifyingOtp ? "Verifying..." : "Verify & Continue →"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Dev bypass note */}
              <div className="text-[11px] text-body-muted text-center pt-3 border-t border-brand-accent/20">
                🔒 Protected by End-to-End Rate Limiting &amp; Secure Verification.
              </div>
            </div>
          )}

          {/* STEP 2: GOTRA, NATIVE PLACE, ADDRESS & GOVERNMENT ID */}
          {step === 2 && (
            <div>
              <h2 className="text-base sm:text-lg font-bold text-brand-primary mb-1">
                Step 2: Gotra, Ancestry & Residential Address
              </h2>
              <p className="text-xs text-body-muted mb-6">
                Establish your 18-Gotras ancestry, ancestral roots, and verified residential address.
              </p>

              {step2Error && (
                <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
                  ⚠️ {step2Error}
                </div>
              )}

              <div className="space-y-4 mb-6">
                {/* 1. Head of Household Full Name */}
                <div>
                  <label className="block text-xs font-bold text-body-heading mb-1">
                    Head of Household Full Name (मुखिया का नाम) *
                  </label>
                  <input
                    type="text"
                    value={headName}
                    onChange={(e) => setHeadName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar Agarwal"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-brand-accent/40 text-xs text-body-heading bg-white focus:ring-1 focus:ring-brand-primary outline-none"
                  />
                </div>

                {/* 2. Gotra & Ancestral Native Place */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-body-heading mb-1">
                      Family Gotra (गोत्र) *
                    </label>
                    <select
                      value={gotra}
                      onChange={(e) => setGotra(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-brand-accent/40 text-xs text-body-heading bg-white focus:ring-1 focus:ring-brand-primary outline-none font-semibold"
                    >
                      {gotras.map((g) => (
                        <option key={g.name} value={g.name}>
                          {g.name} ({g.devanagari})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-body-heading mb-1">
                      Ancestral Native Place (मूल निवास / पैतृक स्थान) *
                    </label>
                    <input
                      type="text"
                      value={nativePlace}
                      onChange={(e) => setNativePlace(e.target.value)}
                      placeholder="e.g. Agroha, Hisar / Sikar / Jhunjhunu"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-brand-accent/40 text-xs text-body-heading bg-white focus:ring-1 focus:ring-brand-primary outline-none"
                    />
                  </div>
                </div>

                {/* 3. Cascading Location Selector */}
                <div className="p-4 rounded-2xl border border-brand-accent/30 bg-canvas-warm/20">
                  <h3 className="text-xs font-bold text-brand-primary mb-3">
                    Current Residential Location (वर्तमान निवास स्थान)
                  </h3>
                  <LocationSelector
                    country={country}
                    state={state}
                    city={city}
                    postalCode={postalCode}
                    fullAddress={fullAddress}
                    onPhoneCodeChange={(code) => setPhoneDialCode(code)}
                    onLocationChange={(locData) => {
                      if (typeof locData === "object") {
                        setCountry(locData.country || "India");
                        setState(locData.state || "");
                        setCity(locData.city || "");
                        setPostalCode(locData.postalCode || "");
                        setFullAddress(locData.fullAddress || "");
                      }
                    }}
                  />
                </div>

                {/* 4. Country-Specific Government Identity Verification */}
                <div className="p-4 rounded-2xl border border-brand-accent/30 bg-canvas-warm/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-brand-primary">
                      Identity Verification (पहचान प्रमाणन) *
                    </h3>
                    <span className="text-[10px] font-semibold text-brand-gold uppercase tracking-wider">
                      {isIndia ? "India (Aadhaar + PAN)" : "International (Passport + ID)"}
                    </span>
                  </div>

                  {isIndia ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-body-heading mb-1">
                          Aadhaar Number (12-Digit) *
                        </label>
                        <input
                          type="text"
                          maxLength={14}
                          value={aadhaarNumber}
                          onChange={(e) => setAadhaarNumber(e.target.value)}
                          placeholder="e.g. 1234 5678 9012"
                          className="w-full px-3 py-2 rounded-lg border border-brand-accent/40 text-xs text-body-heading bg-white focus:ring-1 focus:ring-brand-primary outline-none font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-body-heading mb-1">
                          PAN Card Number (10-Digit Alphanumeric) *
                        </label>
                        <input
                          type="text"
                          maxLength={10}
                          value={panNumber}
                          onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                          placeholder="e.g. ABCDE1234F"
                          className="w-full px-3 py-2 rounded-lg border border-brand-accent/40 text-xs text-body-heading bg-white focus:ring-1 focus:ring-brand-primary outline-none font-mono uppercase"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-body-heading mb-1">
                          Passport Number *
                        </label>
                        <input
                          type="text"
                          value={passportNumber}
                          onChange={(e) => setPassportNumber(e.target.value.toUpperCase())}
                          placeholder="e.g. E1234567"
                          className="w-full px-3 py-2 rounded-lg border border-brand-accent/40 text-xs text-body-heading bg-white focus:ring-1 focus:ring-brand-primary outline-none font-mono uppercase"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-body-heading mb-1">
                          Govt-Issued ID / Tax ID *
                        </label>
                        <input
                          type="text"
                          value={govtIdNumber}
                          onChange={(e) => setGovtIdNumber(e.target.value.toUpperCase())}
                          placeholder="e.g. NRIC / SSN / National ID"
                          className="w-full px-3 py-2 rounded-lg border border-brand-accent/40 text-xs text-body-heading bg-white focus:ring-1 focus:ring-brand-primary outline-none font-mono uppercase"
                        />
                      </div>
                    </div>
                  )}
                  <p className="text-[10px] text-body-muted">
                    🔒 All government identification documents are stored encrypted and masked for strict administrative compliance.
                  </p>
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-between gap-3 pt-4 border-t border-brand-accent/20">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-full text-xs font-bold text-body-heading bg-canvas-warm hover:bg-white border border-brand-accent/30"
                >
                  ← Back to Verification
                </button>
                <button
                  type="button"
                  onClick={handleStep2Next}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-full text-xs font-bold text-white va-btn-maroon shadow-md"
                >
                  Continue to Family Members →
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: FAMILY MEMBERS & PROFESSION */}
          {step === 3 && (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-brand-primary mb-0.5">
                    Step 3: Family Members &amp; Profiles
                  </h2>
                  <p className="text-xs text-body-muted">
                    Complete your profile and add family members living in your household.
                  </p>
                </div>
              </div>

              {step3Error && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
                  ⚠️ {step3Error}
                </div>
              )}

              <div className="space-y-5 mb-6">
                {members.map((member, index) => {
                  const calculatedAge = calculateAge(member.dob);
                  const isMinor = calculatedAge !== null && calculatedAge < 18;

                  return (
                    <div
                      key={member.id}
                      className="p-4 sm:p-5 rounded-2xl border border-brand-accent/30 bg-canvas-warm/20 relative"
                    >
                      <div className="flex items-center justify-between mb-4 pb-2 border-b border-brand-accent/20">
                        <span className="text-xs font-bold text-brand-primary">
                          Member #{index + 1} {index === 0 && "(Head of Household - मुखिया)"}
                        </span>
                        {index > 0 && (
                          <button
                            type="button"
                            onClick={() => removeMember(member.id)}
                            className="text-xs font-semibold text-red-600 hover:text-red-800"
                          >
                            ✕ Remove Member
                          </button>
                        )}
                      </div>

                      {/* Photo Avatar Uploader */}
                      <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 mb-5 p-3 sm:p-4 rounded-xl bg-white border border-brand-accent/30 text-center sm:text-left">
                        <div className="w-14 h-14 rounded-full overflow-hidden bg-gradient-to-br from-[#fff7dd] to-[#fae8b2] border-2 border-brand-accent flex items-center justify-center shrink-0 shadow-sm relative mx-auto sm:mx-0">
                          {member.photoUrl ? (
                            <img
                              src={member.photoUrl}
                              alt={member.fullName || "Member"}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-lg font-extrabold text-brand-primary">
                              {member.fullName ? member.fullName.charAt(0).toUpperCase() : (index === 0 ? "H" : "M")}
                            </span>
                          )}
                        </div>

                        <div className="flex-1 w-full">
                          <label className="block text-[11px] font-bold text-body-heading mb-1.5">
                            Profile Picture (प्रोफ़ाइल फोटो) {index === 0 ? "* (Required for Pass)" : "(Recommended)"}
                          </label>
                          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                            <label className="cursor-pointer px-3 py-1.5 rounded-lg text-[11px] font-bold bg-canvas-warm text-brand-primary border border-brand-accent/40 hover:bg-white transition-all shadow-xs">
                              {member.photoUrl ? "Change Photo" : "Upload Photo"}
                              <input
                                type="file"
                                accept="image/png, image/jpeg, image/webp"
                                className="hidden"
                                onChange={(e) => handlePhotoUpload(member.id, e)}
                              />
                            </label>
                            {member.photoUrl && (
                              <button
                                type="button"
                                onClick={() => updateMember(member.id, "photoUrl", "")}
                                className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-red-600 hover:bg-red-50"
                              >
                                Remove
                              </button>
                            )}
                            <span className="text-[10px] text-body-muted block sm:inline">
                              JPG, PNG or WebP &bull; Max 2MB
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                        {/* 1. Full Name */}
                        <div className="min-w-0">
                          <label className="block text-[11px] font-bold text-body-heading mb-1">
                            Full Name (पूरा नाम) *
                          </label>
                          <input
                            type="text"
                            value={member.fullName}
                            onChange={(e) => updateMember(member.id, "fullName", e.target.value)}
                            placeholder="e.g. Rahul Agarwal"
                            className="w-full px-3 py-2 rounded-lg border border-brand-accent/40 text-xs bg-white focus:ring-1 focus:ring-brand-primary"
                          />
                        </div>

                        {/* 2. Father's Name */}
                        <div className="min-w-0">
                          <label className="block text-[11px] font-bold text-body-heading mb-1">
                            Father&apos;s Full Name (पिता का नाम) {index === 0 ? "*" : "(Optional)"}
                          </label>
                          <input
                            type="text"
                            value={member.fatherName || ""}
                            onChange={(e) => updateMember(member.id, "fatherName", e.target.value)}
                            placeholder="e.g. Shri Ramesh Kumar Agarwal"
                            className="w-full px-3 py-2 rounded-lg border border-brand-accent/40 text-xs bg-white focus:ring-1 focus:ring-brand-primary"
                          />
                        </div>

                        {/* 3. Relation */}
                        <div className="min-w-0">
                          <label className="block text-[11px] font-bold text-body-heading mb-1">
                            Relation to Head (संबंध) *
                          </label>
                          <select
                            value={member.relationToHead}
                            disabled={index === 0}
                            onChange={(e) => updateMember(member.id, "relationToHead", e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-brand-accent/40 text-xs bg-white focus:ring-1 focus:ring-brand-primary"
                          >
                            <option value="self">Self (Head - मुखिया)</option>
                            <option value="spouse">Spouse (पत्नी/पति)</option>
                            <option value="son">Son (बेटा)</option>
                            <option value="daughter">Daughter (बेटी)</option>
                            <option value="father">Father (पिता)</option>
                            <option value="mother">Mother (माता)</option>
                            <option value="brother">Brother (भाई)</option>
                            <option value="sister">Sister (बहन)</option>
                            <option value="daughter_in_law">Daughter-in-law (बहू)</option>
                            <option value="son_in_law">Son-in-law (दामाद)</option>
                            <option value="grandson">Grandson (पोता/दोहिता)</option>
                            <option value="granddaughter">Granddaughter (पोती/दोहिती)</option>
                            <option value="other">Other Relative</option>
                          </select>
                        </div>

                        {/* 4. Phone Number (Optional for family members) */}
                        <div className="min-w-0">
                          <label className="block text-[11px] font-bold text-body-heading mb-1">
                            Mobile Phone {index === 0 ? "* (Verified)" : "(Optional - for Claim Login)"}
                          </label>
                          {index === 0 && contactType === "phone" ? (
                            <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-emerald-300 bg-emerald-50 text-xs font-semibold text-emerald-900">
                              <span>📱 {contactValue}</span>
                              <span className="ml-auto text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">✓ Verified</span>
                            </div>
                          ) : (
                            <div>
                              <input
                                type="tel"
                                value={member.phone || ""}
                                onChange={(e) => {
                                  updateMember(member.id, "phone", e.target.value);
                                  if (contactFieldErrors[`${member.id}_phone`]) {
                                    checkContactField(member.id, "phone", e.target.value);
                                  }
                                }}
                                onBlur={(e) => checkContactField(member.id, "phone", e.target.value)}
                                placeholder="e.g. +91 98765 43210"
                                className={`w-full px-3 py-2 rounded-lg border text-xs bg-white focus:ring-1 focus:ring-brand-primary ${
                                  contactFieldErrors[`${member.id}_phone`]
                                    ? "border-red-400 bg-red-50/50"
                                    : "border-brand-accent/40"
                                }`}
                              />
                              {contactFieldErrors[`${member.id}_phone`] && (
                                <span className="text-[10px] text-red-600 font-semibold block mt-1">
                                  ⚠️ {contactFieldErrors[`${member.id}_phone`]}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* 5. Email Address (Optional for family members) */}
                        <div className="min-w-0">
                          <label className="block text-[11px] font-bold text-body-heading mb-1">
                            Email Address {index === 0 ? "* (Verified)" : "(Optional)"}
                          </label>
                          {index === 0 && contactType === "email" ? (
                            <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-emerald-300 bg-emerald-50 text-xs font-semibold text-emerald-900">
                              <span>✉️ {contactValue}</span>
                              <span className="ml-auto text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">✓ Verified</span>
                            </div>
                          ) : (
                            <div>
                              <input
                                type="email"
                                value={member.email || ""}
                                onChange={(e) => {
                                  updateMember(member.id, "email", e.target.value);
                                  if (contactFieldErrors[`${member.id}_email`]) {
                                    checkContactField(member.id, "email", e.target.value);
                                  }
                                }}
                                onBlur={(e) => checkContactField(member.id, "email", e.target.value)}
                                placeholder="e.g. member@example.com"
                                className={`w-full px-3 py-2 rounded-lg border text-xs bg-white focus:ring-1 focus:ring-brand-primary ${
                                  contactFieldErrors[`${member.id}_email`]
                                    ? "border-red-400 bg-red-50/50"
                                    : "border-brand-accent/40"
                                }`}
                              />
                              {contactFieldErrors[`${member.id}_email`] && (
                                <span className="text-[10px] text-red-600 font-semibold block mt-1">
                                  ⚠️ {contactFieldErrors[`${member.id}_email`]}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* 6. Date of Birth with Live Age Calculation */}
                        <div className="min-w-0">
                          <label className="block text-[11px] font-bold text-body-heading mb-1">
                            Date of Birth (जन्म तिथि) *
                          </label>
                          <input
                            type="date"
                            max={new Date().toISOString().split("T")[0]}
                            min="1910-01-01"
                            value={member.dob}
                            onChange={(e) => updateMember(member.id, "dob", e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-brand-accent/40 text-xs bg-white text-body-heading focus:ring-1 focus:ring-brand-primary min-w-0"
                          />
                          {calculatedAge !== null && (
                            <span className="text-[10px] text-brand-gold font-bold block mt-0.5">
                              Calculated Age: {calculatedAge} yrs {isMinor ? "• Minor (<18)" : "• Adult"}
                            </span>
                          )}
                        </div>

                        {/* 7. Gender */}
                        <div className="min-w-0">
                          <label className="block text-[11px] font-bold text-body-heading mb-1">
                            Gender (लिंग) *
                          </label>
                          <select
                            value={member.gender}
                            onChange={(e) => updateMember(member.id, "gender", e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-brand-accent/40 text-xs bg-white focus:ring-1 focus:ring-brand-primary"
                          >
                            <option value="Male">Male (पुरुष)</option>
                            <option value="Female">Female (महिला)</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>

                        {/* 8. Marital Status */}
                        <div className="min-w-0">
                          <label className="block text-[11px] font-bold text-body-heading mb-1">
                            Marital Status (वैवाहिक स्थिति) *
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
                              <option value="Married">Married (विवाहित)</option>
                              <option value="Unmarried">Unmarried (अविवाहित)</option>
                              <option value="Widowed">Widowed (विधवा/विधुर)</option>
                              <option value="Divorced">Divorced</option>
                            </select>
                          )}
                        </div>

                        {/* 9. Profession Title */}
                        <div className="min-w-0">
                          <label className="block text-[11px] font-bold text-body-heading mb-1">
                            Profession Title (व्यवसाय / पद) *
                          </label>
                          <input
                            type="text"
                            value={member.professionTitle || member.profession}
                            onChange={(e) => {
                              updateMember(member.id, "professionTitle", e.target.value);
                              updateMember(member.id, "profession", e.target.value);
                            }}
                            placeholder={isMinor ? "e.g. Student" : "e.g. Chartered Accountant / Business Owner"}
                            className="w-full px-3 py-2 rounded-lg border border-brand-accent/40 text-xs bg-white focus:ring-1 focus:ring-brand-primary"
                          />
                        </div>

                        {/* 10. Profession Description with Example */}
                        <div className="sm:col-span-2 lg:col-span-3 min-w-0">
                          <label className="block text-[11px] font-bold text-body-heading mb-1">
                            Profession Description (एक पंक्ति में विवरण)
                          </label>
                          <input
                            type="text"
                            value={member.professionDescription || ""}
                            onChange={(e) => updateMember(member.id, "professionDescription", e.target.value)}
                            placeholder="e.g. Senior Partner at Singhania & Co., dealing in Corporate Tax & Auditing"
                            className="w-full px-3 py-2 rounded-lg border border-brand-accent/40 text-xs bg-white focus:ring-1 focus:ring-brand-primary"
                          />
                          <span className="text-[10px] text-body-muted mt-0.5 block">
                            Example: &quot;Managing Director of AG Textiles Pvt Ltd, exporting cotton fabrics to SE Asia&quot;
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom "+ Add Family Member" CTA */}
              <div className="mb-6 p-4 rounded-2xl border-2 border-dashed border-brand-accent/50 bg-canvas-warm/30 text-center">
                <p className="text-xs text-body-muted mb-3">
                  Have more family members living in your household? You can add children, parents, and relatives now or later from your dashboard.
                </p>
                <button
                  type="button"
                  onClick={addMember}
                  className="px-6 py-2.5 rounded-full text-xs font-bold text-brand-primary bg-white border border-brand-accent hover:bg-canvas-warm transition-all shadow-sm"
                >
                  + Add Another Family Member (परिवार का सदस्य जोड़ें)
                </button>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-between gap-3 pt-4 border-t border-brand-accent/20">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-full text-xs font-bold text-body-heading bg-canvas-warm hover:bg-white border border-brand-accent/30"
                >
                  ← Back to Origin & Address
                </button>
                <button
                  type="button"
                  onClick={handleStep3Next}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-full text-xs font-bold text-white va-btn-maroon shadow-md"
                >
                  Review &amp; Final Submission →
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: REVIEW & FINAL SUBMISSION (Masked Privacy by Default) */}
          {step === 4 && (
            <div>
              <h2 className="text-base sm:text-lg font-bold text-brand-primary mb-1">
                Step 4: Review Registration & Community Consent
              </h2>
              <p className="text-xs text-body-muted mb-6">
                Verify your family details before submission. Contacts are permanently masked across the directory for privacy.
              </p>

              {/* Summary Review Card */}
              <div className="p-4 sm:p-5 rounded-2xl border border-brand-accent/30 bg-canvas-warm/40 mb-6 space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-brand-accent/20">
                  <div className="w-14 h-14 rounded-full overflow-hidden bg-gradient-to-br from-[#fff7dd] to-[#fae8b2] border border-brand-accent flex items-center justify-center shrink-0">
                    {members[0]?.photoUrl ? (
                      <img src={members[0].photoUrl} alt={headName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-base font-extrabold text-brand-primary">{headName ? headName.charAt(0) : "H"}</span>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-brand-primary">{headName}</h3>
                      <span className="text-[10px] font-mono font-bold bg-brand-gold/20 text-brand-primary px-2 py-0.5 rounded-md">
                        MAFL-000-000-000
                      </span>
                    </div>
                    <p className="text-[11px] text-body-muted">
                      Father: <strong>{members[0]?.fatherName || "Not specified"}</strong> &bull; Gotra: <strong>{gotra}</strong>
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-body-muted block text-[11px]">Ancestral Native Place:</span>
                    <strong className="text-brand-primary">{nativePlace}</strong>
                  </div>
                  <div>
                    <span className="text-body-muted block text-[11px]">Residential Location:</span>
                    <strong className="text-brand-primary">{city}, {state} ({country}) - {postalCode}</strong>
                  </div>
                  <div>
                    <span className="text-body-muted block text-[11px]">Primary Contact (Masked):</span>
                    <strong className="text-brand-primary">
                      {contactType === "phone" ? maskPhone(contactValue) : maskEmail(contactValue)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-body-muted block text-[11px]">Identity Document:</span>
                    <strong className="text-brand-primary">
                      {isIndia ? `Aadhaar (•••• •••• ${aadhaarNumber.slice(-4)}) • PAN (${panNumber.slice(0, 2)}•••••${panNumber.slice(-1)})` : `Passport (${passportNumber.slice(0, 2)}••••) • ID (${govtIdNumber})`}
                    </strong>
                  </div>
                </div>

                <div className="pt-3 border-t border-brand-accent/20">
                  <span className="text-body-muted block text-[11px] mb-2">Registered Household Members ({members.length}):</span>
                  <div className="space-y-2">
                    {members.map((m, idx) => {
                      const age = calculateAge(m.dob);
                      return (
                        <div key={m.id} className="text-xs bg-white border border-brand-accent/30 p-2.5 rounded-xl flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {m.photoUrl ? (
                              <img src={m.photoUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-brand-accent/30 text-brand-primary flex items-center justify-center text-[10px] font-bold">
                                {m.fullName ? m.fullName.charAt(0) : "M"}
                              </div>
                            )}
                            <div>
                              <span className="font-bold text-body-heading">{m.fullName || `Member #${idx + 1}`}</span>
                              <span className="text-[11px] text-body-muted ml-1.5">({m.relationToHead})</span>
                              {m.professionTitle && <span className="text-[10px] text-brand-gold block">{m.professionTitle}</span>}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-[11px] font-bold text-brand-primary">{age !== null ? `${age} yrs` : "Age N/A"}</span>
                            <span className="text-[10px] text-body-muted block">{m.gender}</span>
                          </div>
                        </div>
                      );
                    })}
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
                    I confirm that I am authorized to register these details for my family under the <strong>Maharaja Agrasen Foundation Limited Singapore</strong> platform, and I agree to the community <Link href="/terms" className="underline font-bold">Terms of Service</Link> and <Link href="/privacy" className="underline font-bold">Privacy Policy</Link>.
                  </span>
                </label>
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
