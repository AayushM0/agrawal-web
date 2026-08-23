'use client';

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import WizardProgressBar from "@/components/wizard/WizardProgressBar";
import { gotras } from "@/data/gotras";
import { Member } from "@/types/household";
import { registerHousehold, checkContactRegistration } from "@/actions/register";
import { checkContactAvailability } from "@/actions/claim";
import { sendOtp, verifyOtp } from "@/actions/otp";
import { getSession, clearSession } from "@/actions/auth";
import LocationSelector from "@/components/LocationSelector";

function calculateAge(dobStr?: string): number | null {
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

function maskGovtId(id?: string): string {
  if (!id) return "••••";
  const clean = id.trim();
  if (clean.length <= 4) return "••••";
  return clean.slice(0, 2) + "••••••••" + clean.slice(-2);
}

export default function SignupPage() {
  const router = useRouter();

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
  const [contactType, setContactType] = useState<"phone" | "email">("phone");
  const [contactValue, setContactValue] = useState("");
  const [phoneDialCode, setPhoneDialCode] = useState("+91");
  const [otpValue, setOtpValue] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpMessage, setOtpMessage] = useState("");
  const [otpError, setOtpError] = useState("");
  const [alreadyRegisteredInfo, setAlreadyRegisteredInfo] = useState<{ isRegistered: boolean; householdCode?: string; headName?: string } | null>(null);

  useEffect(() => {
    // 1. Read contact from sessionStorage (then immediately scrub URL if any)
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("agrawal_signup_contact");
      if (stored) {
        setContactValue(stored);
        setContactType(stored.includes("@") ? "email" : "phone");
        sessionStorage.removeItem("agrawal_signup_contact");
      }

      // Clean browser URL if query param is present
      if (window.location.search) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  // Step 2: Head & Family Details State
  const [headName, setHeadName] = useState("");
  const [headFatherName, setHeadFatherName] = useState("");
  const [headPhotoUrl, setHeadPhotoUrl] = useState("");
  const [headDob, setHeadDob] = useState("");
  const [headGender, setHeadGender] = useState("Male");
  const [headMaritalStatus, setHeadMaritalStatus] = useState("Married");
  const [headProfessionTitle, setHeadProfessionTitle] = useState("");
  const [headProfessionDescription, setHeadProfessionDescription] = useState("");

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
  const headAge = calculateAge(headDob);

  // Step 3: Additional Family Members State (Optional)
  const [additionalMembers, setAdditionalMembers] = useState<Member[]>([]);
  const [step3Error, setStep3Error] = useState("");

  // Step 4: Consent State
  const [consentGiven, setConsentGiven] = useState(false);

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
      if (typeof window !== "undefined") {
        sessionStorage.setItem("agrawal_login_contact", contactValue.trim());
      }
      setTimeout(() => {
        router.push("/login");
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
      setOtpMessage("✓ Contact verified successfully! Auto-advancing to Head & Family Details...");
      setTimeout(() => {
        setStep(2);
      }, 400);
    } else {
      setOtpError(res.error || "Invalid OTP code.");
    }
  };

  // Head Photo Upload Handler
  const handleHeadPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("Please select an image smaller than 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      const dataUrl = loadEvt.target?.result as string;
      setHeadPhotoUrl(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // Step 2 Validation & Transition
  const handleStep2Next = (e: React.FormEvent) => {
    e.preventDefault();
    setStep2Error("");

    if (!headPhotoUrl || !headPhotoUrl.trim()) {
      setStep2Error("A profile photograph is mandatory for the Head of Household (मुखिया का फोटो अपलोड करना अनिवार्य है).");
      return;
    }
    if (!headName.trim() || headName.trim().length < 2) {
      setStep2Error("Please enter the Head of Household's full name (मुखिया का नाम).");
      return;
    }
    if (!headFatherName.trim() || headFatherName.trim().length < 2) {
      setStep2Error("Father's Name (पिता का नाम) is mandatory for the Head of Household.");
      return;
    }
    if (!headDob.trim()) {
      setStep2Error("Please enter a valid Date of Birth (जन्म तिथि) for the Head of Household.");
      return;
    }
    if (!headProfessionTitle.trim() || headProfessionTitle.trim().length < 2) {
      setStep2Error("Profession Title (व्यवसाय / पद) is required.");
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

  // Step 3 Additional Members Handlers
  const addAdditionalMember = () => {
    const newMember: Member = {
      id: `m-${Date.now()}`,
      fullName: "",
      relationToHead: "spouse",
      fatherName: "",
      photoUrl: "",
      phone: "",
      email: "",
      dob: "",
      gender: "Female",
      maritalStatus: "Married",
      currentCity: city || nativePlace || "",
      currentCountry: country || "India",
      postalCode: postalCode || "",
      state: state || "",
      fullAddress: fullAddress || "",
      profession: "",
      professionTitle: "",
      professionDescription: "",
      aadhaarNumber: "",
      panNumber: "",
      passportNumber: "",
      govtIdNumber: "",
      verifiedBySelf: false,
      ownerLocked: false,
      visibility: {
        contactInfo: "hidden",
        dob: "hidden",
        photo: "public_to_members",
      },
    };
    setAdditionalMembers([...additionalMembers, newMember]);
  };

  const removeAdditionalMember = (id: string) => {
    setAdditionalMembers(additionalMembers.filter((m) => m.id !== id));
  };

  const updateAdditionalMember = (id: string, field: keyof Member, value: any) => {
    setAdditionalMembers(
      additionalMembers.map((m) => {
        if (m.id !== id) return m;
        return { ...m, [field]: value };
      })
    );
  };

  const handleMemberPhoto = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("Please select an image smaller than 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      const dataUrl = loadEvt.target?.result as string;
      updateAdditionalMember(id, "photoUrl", dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // Step 3 Validation & Transition
  const handleStep3Next = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep3Error("");

    // Validate any added members
    for (let i = 0; i < additionalMembers.length; i++) {
      const m = additionalMembers[i];
      if (!m.fullName.trim() || m.fullName.trim().length < 2) {
        setStep3Error(`Please enter a valid Full Name for Additional Family Member #${i + 1}.`);
        return;
      }
      if (!m.photoUrl || !m.photoUrl.trim()) {
        setStep3Error(`A profile photograph is mandatory for ${m.fullName || `Member #${i + 1}`} (फोटो अपलोड करना अनिवार्य है).`);
        return;
      }
      if (!m.dob || !m.dob.trim()) {
        setStep3Error(`Please enter Date of Birth for ${m.fullName || `Member #${i + 1}`}.`);
        return;
      }
      if (m.phone && m.phone.trim()) {
        const checkPhone = await checkContactAvailability(m.phone.trim(), m.id);
        if (!checkPhone.available && checkPhone.conflict) {
          setStep3Error(`Phone '${m.phone}' for ${m.fullName} is already registered under #${checkPhone.conflict.householdCode}.`);
          return;
        }
      }
      if (m.email && m.email.trim()) {
        const checkEmail = await checkContactAvailability(m.email.trim(), m.id);
        if (!checkEmail.available && checkEmail.conflict) {
          setStep3Error(`Email '${m.email}' for ${m.fullName} is already registered under #${checkEmail.conflict.householdCode}.`);
          return;
        }
      }
    }

    setStep(4);
  };

  // Step 4 Final Submit
  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consentGiven) {
      alert("Please accept the community guidelines consent.");
      return;
    }

    setIsSubmitting(true);

    const headMember: Member = {
      id: "m-1",
      fullName: headName.trim(),
      relationToHead: "self",
      fatherName: headFatherName.trim(),
      photoUrl: headPhotoUrl || undefined,
      phone: contactType === "phone" ? contactValue.trim() : undefined,
      email: contactType === "email" ? contactValue.trim() : undefined,
      dob: headDob.trim(),
      gender: headGender as any,
      maritalStatus: headMaritalStatus as any,
      currentCity: city.trim() || nativePlace.trim(),
      currentCountry: country.trim(),
      postalCode: postalCode.trim(),
      state: state.trim(),
      fullAddress: fullAddress.trim(),
      profession: headProfessionTitle.trim(),
      professionTitle: headProfessionTitle.trim(),
      professionDescription: headProfessionDescription.trim() || undefined,
      aadhaarNumber: isIndia ? aadhaarNumber.trim() : undefined,
      panNumber: isIndia ? panNumber.trim().toUpperCase() : undefined,
      passportNumber: !isIndia ? passportNumber.trim() : undefined,
      govtIdNumber: !isIndia ? govtIdNumber.trim() : undefined,
      verifiedBySelf: true,
      ownerLocked: true,
      visibility: {
        contactInfo: "hidden",
        dob: "hidden",
        photo: "public_to_members",
      },
    };

    const structuredAdditionalMembers: Member[] = additionalMembers.map((m) => ({
      ...m,
      fullName: m.fullName.trim(),
      fatherName: m.fatherName ? m.fatherName.trim() : undefined,
      photoUrl: m.photoUrl || undefined,
      phone: m.phone ? m.phone.trim() : undefined,
      email: m.email ? m.email.trim() : undefined,
      dob: m.dob.trim(),
      currentCity: m.currentCity?.trim() || city.trim(),
      currentCountry: m.currentCountry?.trim() || country.trim(),
      postalCode: m.postalCode?.trim() || postalCode.trim(),
      state: m.state?.trim() || state.trim(),
      fullAddress: m.fullAddress?.trim() || fullAddress.trim(),
      profession: m.professionTitle?.trim() || m.profession?.trim() || "Unspecified",
      professionTitle: m.professionTitle?.trim() || undefined,
      professionDescription: m.professionDescription?.trim() || undefined,
      aadhaarNumber: m.aadhaarNumber?.trim() || undefined,
      panNumber: m.panNumber?.trim() || undefined,
      passportNumber: m.passportNumber?.trim() || undefined,
      govtIdNumber: m.govtIdNumber?.trim() || undefined,
      verifiedBySelf: false,
      ownerLocked: false,
      visibility: {
        contactInfo: "hidden",
        dob: "hidden",
        photo: "public_to_members",
      },
    }));

    const allMembersPayload = [headMember, ...structuredAdditionalMembers];

    try {
      const res = await registerHousehold({
        headName: headName.trim(),
        verifiedContact: contactValue.trim(),
        gotra,
        nativePlace: nativePlace.trim(),
        country: country.trim(),
        postalCode: postalCode.trim(),
        state: state.trim(),
        city: city.trim(),
        fullAddress: fullAddress.trim(),
        aadhaarNumber: isIndia ? aadhaarNumber.trim() : undefined,
        panNumber: isIndia ? panNumber.trim().toUpperCase() : undefined,
        passportNumber: !isIndia ? passportNumber.trim() : undefined,
        govtIdNumber: !isIndia ? govtIdNumber.trim() : undefined,
        members: allMembersPayload,
        consentAccepted: consentGiven,
      });

      setIsSubmitting(false);
      if (res.success) {
        setSuccessCode(res.serialNo || res.householdCode || "MAFL-000-000-001");
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

  // SUCCESS SCREEN
  if (isSuccess) {
    return (
      <main className="py-12 sm:py-20 bg-canvas-page min-h-[70vh] flex items-center">
        <div className="max-w-xl mx-auto px-4 w-full text-center">
          <div className="bg-white border-2 border-brand-accent/40 rounded-3xl p-6 sm:p-12 shadow-warmLg">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-2xl sm:text-3xl font-bold mx-auto mb-4 border border-emerald-300">
              ✓
            </div>
            <span className="inline-block text-xs font-bold uppercase va-badge-pending px-3 py-1 rounded-full mb-3">
              Application Submitted For Verification
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-brand-primary mb-2">
              Registration Received Successfully!
            </h1>
            <p className="text-xs sm:text-sm text-body-text mb-6 leading-relaxed">
              Your household submission has been securely registered in the community verification queue. Once approved by a moderator, your family will become visible in the worldwide Agarwal Directory.
            </p>

            <div className="p-4 sm:p-5 rounded-2xl bg-canvas-warm border border-brand-accent/40 mb-6">
              <span className="text-[11px] font-bold text-body-muted block mb-1">
                Your Official Assigned Serial Number (क्रमांक)
              </span>
              <div className="font-mono text-xl sm:text-2xl font-extrabold text-brand-primary tracking-wider select-all">
                #{successCode}
              </div>
              <span className="text-[10px] text-body-muted mt-1 block">
                Save this official serial number for logging in and referencing your family card.
              </span>
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
                      <span className="font-semibold text-body-heading">Mobile (SMS OTP)</span>
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
                      <span className="font-semibold text-body-heading">Email Address (Email OTP)</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-body-heading mb-1">
                    {contactType === "phone" ? "Mobile Phone Number" : "Email Address"} *
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type={contactType === "phone" ? "tel" : "email"}
                      value={contactValue}
                      disabled={otpVerified}
                      onChange={(e) => setContactValue(e.target.value)}
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
                        href="/login"
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

              <div className="text-[11px] text-body-muted text-center pt-3 border-t border-brand-accent/20">
                🔒 Protected by End-to-End Rate Limiting &amp; Secure Verification.
              </div>
            </div>
          )}

          {/* STEP 2: HEAD & FAMILY DETAILS */}
          {step === 2 && (
            <form onSubmit={handleStep2Next}>
              <h2 className="text-base sm:text-lg font-bold text-brand-primary mb-1">
                Step 2: Head &amp; Family Details (मुखिया एवं परिवार विवरण)
              </h2>
              <p className="text-xs text-body-muted mb-6">
                Provide comprehensive profile, lineage, address, and government identification for the Head of Household.
              </p>

              {step2Error && (
                <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
                  ⚠️ {step2Error}
                </div>
              )}

              <div className="space-y-5 mb-6">
                {/* SECTION A: Head Personal Profile */}
                <div className="p-4 rounded-2xl border border-brand-accent/30 bg-canvas-warm/20 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-brand-accent/20">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-brand-primary">
                      👤 Head of Household Profile (मुखिया की जानकारी)
                    </h3>
                    <span className="text-[10px] font-bold va-badge-gold px-2 py-0.5 rounded-full">
                      Primary Representative
                    </span>
                  </div>

                  {/* Photo Upload & Preview */}
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-[#fff7dd] to-[#fae8b2] border-2 border-brand-accent flex items-center justify-center text-xl font-bold text-brand-primary shrink-0 shadow-sm">
                      {headPhotoUrl ? (
                        <img src={headPhotoUrl} alt="Head Profile" className="w-full h-full object-cover" />
                      ) : (
                        headName ? headName.charAt(0).toUpperCase() : "H"
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-body-heading mb-1">
                        Profile Photo (मुखिया का फोटो) *
                      </label>
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/webp"
                        onChange={handleHeadPhotoUpload}
                        className="text-xs text-body-muted file:mr-2 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-canvas-warm file:text-brand-primary hover:file:bg-white"
                      />
                      {!headPhotoUrl && (
                        <span className="text-[10px] text-amber-700 font-semibold block mt-0.5">
                          ⚠️ Photo upload is mandatory for official ID pass
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Name & Father Name */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-body-heading mb-1">
                        Full Name of Household Head (मुखिया का पूरा नाम) *
                      </label>
                      <input
                        type="text"
                        required
                        value={headName}
                        onChange={(e) => setHeadName(e.target.value)}
                        placeholder="e.g. Ramesh Kumar Agarwal"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-brand-accent/40 text-xs text-body-heading bg-white focus:ring-1 focus:ring-brand-primary outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-body-heading mb-1">
                        Father&apos;s Full Name (पिता का नाम) *
                      </label>
                      <input
                        type="text"
                        required
                        value={headFatherName}
                        onChange={(e) => setHeadFatherName(e.target.value)}
                        placeholder="e.g. Late Shri Omprakash Agarwal"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-brand-accent/40 text-xs text-body-heading bg-white focus:ring-1 focus:ring-brand-primary outline-none"
                      />
                    </div>
                  </div>

                  {/* DOB, Age, Gender, Marital Status */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-body-heading">
                          Date of Birth (जन्म तिथि) *
                        </label>
                        {headAge !== null && (
                          <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded">
                            {headAge} yrs
                          </span>
                        )}
                      </div>
                      <input
                        type="date"
                        required
                        value={headDob}
                        onChange={(e) => setHeadDob(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl border border-brand-accent/40 text-xs text-body-heading bg-white focus:ring-1 focus:ring-brand-primary outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-body-heading mb-1">
                        Gender (लिंग) *
                      </label>
                      <select
                        value={headGender}
                        onChange={(e) => setHeadGender(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-brand-accent/40 text-xs text-body-heading bg-white focus:ring-1 focus:ring-brand-primary outline-none"
                      >
                        <option value="Male">Male (पुरुष)</option>
                        <option value="Female">Female (महिला)</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-body-heading mb-1">
                        Marital Status (वैवाहिक स्थिति) *
                      </label>
                      <select
                        value={headMaritalStatus}
                        onChange={(e) => setHeadMaritalStatus(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-brand-accent/40 text-xs text-body-heading bg-white focus:ring-1 focus:ring-brand-primary outline-none"
                      >
                        <option value="Married">Married (विवाहित)</option>
                        <option value="Unmarried">Unmarried (अविवाहित)</option>
                        <option value="Widowed">Widowed (विधवा/विधुर)</option>
                        <option value="Divorced">Divorced</option>
                      </select>
                    </div>
                  </div>

                  {/* Profession Title & 1-line Description */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-body-heading mb-1">
                        Profession Title (व्यवसाय / पद) *
                      </label>
                      <input
                        type="text"
                        required
                        value={headProfessionTitle}
                        onChange={(e) => setHeadProfessionTitle(e.target.value)}
                        placeholder="e.g. Chartered Accountant / Business Owner"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-brand-accent/40 text-xs text-body-heading bg-white focus:ring-1 focus:ring-brand-primary outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-body-heading mb-1">
                        Profession Description (एक पंक्ति में विवरण)
                      </label>
                      <input
                        type="text"
                        value={headProfessionDescription}
                        onChange={(e) => setHeadProfessionDescription(e.target.value)}
                        placeholder="e.g. Senior Partner at Singhania & Co., dealing in Corporate Tax"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-brand-accent/40 text-xs text-body-heading bg-white focus:ring-1 focus:ring-brand-primary outline-none"
                      />
                      <span className="text-[10px] text-body-muted mt-0.5 block">
                        Example: &quot;Managing Director of AG Textiles Pvt Ltd, exporting cotton fabrics&quot;
                      </span>
                    </div>
                  </div>
                </div>

                {/* SECTION B: Family Lineage & Ancestral Origin */}
                <div className="p-4 rounded-2xl border border-brand-accent/30 bg-canvas-warm/20 space-y-3.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-brand-primary pb-1 border-b border-brand-accent/20">
                    🏛️ Lineage &amp; Ancestral Origin (वंश एवं मूल निवास)
                  </h3>

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
                        required
                        value={nativePlace}
                        onChange={(e) => setNativePlace(e.target.value)}
                        placeholder="e.g. Agroha, Hisar / Sikar / Jhunjhunu"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-brand-accent/40 text-xs text-body-heading bg-white focus:ring-1 focus:ring-brand-primary outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION C: 5-Tier Cascading Location Selector */}
                <div className="p-4 rounded-2xl border border-brand-accent/30 bg-canvas-warm/20">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-brand-primary mb-3 pb-1 border-b border-brand-accent/20">
                    📍 Current Residential Address (वर्तमान निवास स्थान)
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

                {/* SECTION D: Country-Specific Government Identity Verification */}
                <div className="p-4 rounded-2xl border border-brand-accent/30 bg-canvas-warm/30 space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-brand-accent/20">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-brand-primary">
                      🛡️ Government Identity Verification (पहचान प्रमाणन) *
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
                          className="w-full px-3 py-2 rounded-lg border border-brand-accent/40 text-xs text-body-heading bg-white focus:ring-1 focus:ring-brand-primary outline-none uppercase font-mono"
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
                          placeholder="e.g. E12345678"
                          className="w-full px-3 py-2 rounded-lg border border-brand-accent/40 text-xs text-body-heading bg-white focus:ring-1 focus:ring-brand-primary outline-none uppercase font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-body-heading mb-1">
                          Government ID / Tax ID *
                        </label>
                        <input
                          type="text"
                          value={govtIdNumber}
                          onChange={(e) => setGovtIdNumber(e.target.value.toUpperCase())}
                          placeholder="e.g. S1234567A / NRIC / SSN"
                          className="w-full px-3 py-2 rounded-lg border border-brand-accent/40 text-xs text-body-heading bg-white focus:ring-1 focus:ring-brand-primary outline-none uppercase font-mono"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Navigation Action Buttons */}
              <div className="flex flex-col-reverse sm:flex-row justify-between gap-3 pt-4 border-t border-brand-accent/20">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-full text-xs font-bold text-body-heading bg-canvas-warm hover:bg-white border border-brand-accent/30 transition-all"
                >
                  ← Back to Contact
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-2.5 rounded-full text-xs font-bold text-white va-btn-join shadow-goldCta flex items-center justify-center gap-1.5"
                >
                  <span>Continue to Family Members (Optional)</span>
                  <span>→</span>
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: ADDITIONAL FAMILY MEMBERS (OPTIONAL) */}
          {step === 3 && (
            <form onSubmit={handleStep3Next}>
              <div className="pb-3 mb-4 border-b border-brand-accent/20">
                <h2 className="text-base sm:text-lg font-bold text-brand-primary">
                  Step 3: Additional Family Members (Optional)
                </h2>
                <p className="text-xs text-body-muted">
                  Adding family members is completely optional. If you live alone or wish to add relatives later, click &quot;Continue to Review&quot;.
                </p>
              </div>

              {step3Error && (
                <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
                  ⚠️ {step3Error}
                </div>
              )}

              {/* Members Cards List */}
              {additionalMembers.length === 0 ? (
                <div className="p-8 rounded-2xl border-2 border-dashed border-brand-accent/40 bg-canvas-warm/30 text-center mb-6">
                  <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-900 flex items-center justify-center text-xl font-bold mx-auto mb-3">
                    👨‍👩‍👧‍👦
                  </div>
                  <h3 className="text-sm font-bold text-brand-primary mb-1">
                    No Additional Family Members Added
                  </h3>
                  <p className="text-xs text-body-muted max-w-md mx-auto mb-4 leading-relaxed">
                    You can proceed to register as a single-member household under <strong>{headName || "Head of Household"}</strong>, or click below to add spouse, children, and parents.
                  </p>
                  <button
                    type="button"
                    onClick={addAdditionalMember}
                    className="px-5 py-2.5 rounded-full text-xs font-bold text-brand-primary bg-white border border-brand-accent hover:bg-canvas-warm shadow-xs"
                  >
                    + Add Spouse, Children, or Parents
                  </button>
                </div>
              ) : (
                <div className="space-y-6 mb-6">
                  {additionalMembers.map((member, index) => {
                    const memberAge = calculateAge(member.dob);
                    const isMinor = memberAge !== null && memberAge < 18;

                    return (
                      <div
                        key={member.id}
                        className="p-5 rounded-2xl border-2 border-brand-accent/30 bg-canvas-warm/20 relative animate-in fade-in space-y-4"
                      >
                        {/* Member Card Header */}
                        <div className="flex items-center justify-between pb-3 border-b border-brand-accent/20">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-brand-primary text-white text-xs font-bold flex items-center justify-center">
                              {index + 2}
                            </span>
                            <h3 className="text-sm font-bold text-brand-primary">
                              {member.fullName || `Family Member #${index + 2}`}
                            </h3>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full va-badge-gold uppercase">
                              {member.relationToHead}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeAdditionalMember(member.id)}
                            className="text-xs font-bold text-red-600 hover:text-red-800 transition-colors"
                          >
                            ✕ Remove
                          </button>
                        </div>

                        {/* Member Photo Upload & Avatar Preview */}
                        <div className="flex items-center gap-4 p-3.5 rounded-xl bg-white border border-brand-accent/30 shadow-xs">
                          <div className="w-14 h-14 rounded-full overflow-hidden bg-gradient-to-br from-[#fff7dd] to-[#fae8b2] border-2 border-brand-accent flex items-center justify-center text-lg font-bold text-brand-primary shrink-0 shadow-xs">
                            {member.photoUrl ? (
                              <img src={member.photoUrl} alt={member.fullName || "Member"} className="w-full h-full object-cover" />
                            ) : (
                              member.fullName ? member.fullName.charAt(0).toUpperCase() : `${index + 2}`
                            )}
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-body-heading mb-1">
                              Member Profile Photo (सदस्य का फोटो) *
                            </label>
                            <input
                              type="file"
                              accept="image/png, image/jpeg, image/webp"
                              onChange={(e) => handleMemberPhoto(member.id, e)}
                              className="text-xs text-body-muted file:mr-2 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-canvas-warm file:text-brand-primary hover:file:bg-white"
                            />
                            {!member.photoUrl && (
                              <span className="text-[10px] text-amber-700 font-semibold block mt-0.5">
                                ⚠️ Photo upload is mandatory for ID pass generation
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Member Inputs Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
                          {/* 1. Full Name */}
                          <div className="min-w-0">
                            <label className="block text-[11px] font-bold text-body-heading mb-1">
                              Full Name (पूरा नाम) *
                            </label>
                            <input
                              type="text"
                              required
                              value={member.fullName}
                              onChange={(e) => updateAdditionalMember(member.id, "fullName", e.target.value)}
                              placeholder="e.g. Sunita Agarwal"
                              className="w-full px-3 py-2 rounded-lg border border-brand-accent/40 text-xs bg-white focus:ring-1 focus:ring-brand-primary"
                            />
                          </div>

                          {/* 2. Relation */}
                          <div className="min-w-0">
                            <label className="block text-[11px] font-bold text-body-heading mb-1">
                              Relation to Head (संबंध) *
                            </label>
                            <select
                              value={member.relationToHead}
                              onChange={(e) => {
                                const rel = e.target.value;
                                updateAdditionalMember(member.id, "relationToHead", rel);
                                if (["father", "son", "brother", "son_in_law", "grandson"].includes(rel)) {
                                  updateAdditionalMember(member.id, "gender", "Male");
                                } else if (["mother", "daughter", "sister", "daughter_in_law", "granddaughter"].includes(rel)) {
                                  updateAdditionalMember(member.id, "gender", "Female");
                                }
                              }}
                              className="w-full px-3 py-2 rounded-lg border border-brand-accent/40 text-xs bg-white focus:ring-1 focus:ring-brand-primary"
                            >
                              <option value="spouse">Spouse (पत्नी/पति)</option>
                              <option value="son">Son (बेटा / पुत्र)</option>
                              <option value="daughter">Daughter (बेटी / पुत्री)</option>
                              <option value="father">Father (पिता)</option>
                              <option value="mother">Mother (माता)</option>
                              <option value="brother">Brother (भाई)</option>
                              <option value="sister">Sister (बहन)</option>
                              <option value="daughter_in_law">Daughter-in-law (बहू)</option>
                              <option value="son_in_law">Son-in-law (दामाद)</option>
                              <option value="grandson">Grandson (पोता/दोहिता)</option>
                              <option value="granddaughter">Granddaughter (पोती/दोहिती)</option>
                              <option value="parent">Parent (माता/पिता)</option>
                              <option value="other">Other Relative (अन्य रिश्तेदार)</option>
                            </select>
                          </div>

                          {/* 3. Father Name */}
                          <div className="min-w-0">
                            <label className="block text-[11px] font-bold text-body-heading mb-1">
                              Father&apos;s Name (पिता का नाम)
                            </label>
                            <input
                              type="text"
                              value={member.fatherName || ""}
                              onChange={(e) => updateAdditionalMember(member.id, "fatherName", e.target.value)}
                              placeholder={member.relationToHead === "son" || member.relationToHead === "daughter" ? (headName || "e.g. Ramesh Agarwal") : "e.g. Late Shri..."}
                              className="w-full px-3 py-2 rounded-lg border border-brand-accent/40 text-xs bg-white focus:ring-1 focus:ring-brand-primary"
                            />
                          </div>

                          {/* 4. DOB & Age Badge */}
                          <div className="min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <label className="block text-[11px] font-bold text-body-heading">
                                Date of Birth *
                              </label>
                              {memberAge !== null && (
                                <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded">
                                  {memberAge} yrs
                                </span>
                              )}
                            </div>
                            <input
                              type="date"
                              required
                              value={member.dob || ""}
                              onChange={(e) => updateAdditionalMember(member.id, "dob", e.target.value)}
                              className="w-full px-3 py-1.5 rounded-lg border border-brand-accent/40 text-xs bg-white focus:ring-1 focus:ring-brand-primary"
                            />
                          </div>

                          {/* 5. Gender */}
                          <div className="min-w-0">
                            <label className="block text-[11px] font-bold text-body-heading mb-1">
                              Gender (लिंग) *
                            </label>
                            <select
                              value={member.gender}
                              onChange={(e) => updateAdditionalMember(member.id, "gender", e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border border-brand-accent/40 text-xs bg-white focus:ring-1 focus:ring-brand-primary"
                            >
                              <option value="Female">Female (महिला)</option>
                              <option value="Male">Male (पुरुष)</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>

                          {/* 6. Marital Status */}
                          <div className="min-w-0">
                            <label className="block text-[11px] font-bold text-body-heading mb-1">
                              Marital Status (वैवाहिक स्थिति) *
                            </label>
                            {isMinor ? (
                              <div className="w-full px-3 py-2 rounded-lg border border-brand-accent/20 text-xs bg-gray-100 text-body-muted font-semibold">
                                Unmarried (Minor)
                              </div>
                            ) : (
                              <select
                                value={member.maritalStatus}
                                onChange={(e) => updateAdditionalMember(member.id, "maritalStatus", e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-brand-accent/40 text-xs bg-white focus:ring-1 focus:ring-brand-primary"
                              >
                                <option value="Married">Married (विवाहित)</option>
                                <option value="Unmarried">Unmarried (अविवाहित)</option>
                                <option value="Widowed">Widowed (विधवा/विधुर)</option>
                                <option value="Divorced">Divorced</option>
                              </select>
                            )}
                          </div>

                          {/* 7. Profession Title */}
                          <div className="min-w-0">
                            <label className="block text-[11px] font-bold text-body-heading mb-1">
                              Profession Title (व्यवसाय)
                            </label>
                            <input
                              type="text"
                              value={member.professionTitle || member.profession || ""}
                              onChange={(e) => {
                                updateAdditionalMember(member.id, "professionTitle", e.target.value);
                                updateAdditionalMember(member.id, "profession", e.target.value);
                              }}
                              placeholder={isMinor ? "e.g. Student" : "e.g. Doctor / Homemaker"}
                              className="w-full px-3 py-2 rounded-lg border border-brand-accent/40 text-xs bg-white focus:ring-1 focus:ring-brand-primary"
                            />
                          </div>

                          {/* 8. Phone (Optional) */}
                          <div className="min-w-0">
                            <label className="block text-[11px] font-bold text-body-heading mb-1">
                              Direct Phone (Optional)
                            </label>
                            <input
                              type="tel"
                              value={member.phone || ""}
                              onChange={(e) => updateAdditionalMember(member.id, "phone", e.target.value)}
                              placeholder="+91 98765 43210"
                              className="w-full px-3 py-2 rounded-lg border border-brand-accent/40 text-xs bg-white focus:ring-1 focus:ring-brand-primary"
                            />
                            <span className="text-[9px] text-body-muted block mt-0.5">
                              Can be used for member login.
                            </span>
                          </div>

                          {/* 9. Email (Optional) */}
                          <div className="min-w-0">
                            <label className="block text-[11px] font-bold text-body-heading mb-1">
                              Direct Email (Optional)
                            </label>
                            <input
                              type="email"
                              value={member.email || ""}
                              onChange={(e) => updateAdditionalMember(member.id, "email", e.target.value)}
                              placeholder="member@example.com"
                              className="w-full px-3 py-2 rounded-lg border border-brand-accent/40 text-xs bg-white focus:ring-1 focus:ring-brand-primary"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Bottom Actions */}
              <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-4 border-t border-brand-accent/20">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-full text-xs font-bold text-body-heading bg-canvas-warm hover:bg-white border border-brand-accent/30 transition-all"
                >
                  ← Back to Head Profile
                </button>

                <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={addAdditionalMember}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-full text-xs font-bold text-brand-primary bg-canvas-warm hover:bg-white border-2 border-brand-accent hover:border-brand-primary transition-all shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <span>+ Add Family Member (सदस्य जोड़ें)</span>
                  </button>
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-6 py-2.5 rounded-full text-xs font-bold text-white va-btn-join shadow-goldCta flex items-center justify-center gap-1.5"
                  >
                    <span>
                      {additionalMembers.length === 0 ? "Skip & Continue to Review" : "Continue to Review & Submit"}
                    </span>
                    <span>→</span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* STEP 4: REVIEW & SUBMISSION */}
          {step === 4 && (
            <div>
              <h2 className="text-base sm:text-lg font-bold text-brand-primary mb-1">
                Step 4: Review Registration &amp; Submit
              </h2>
              <p className="text-xs text-body-muted mb-6">
                Please verify all household and family member details before final submission.
              </p>

              <div className="space-y-4 mb-6">
                {/* 1. Head Card Summary */}
                <div className="p-4 sm:p-5 rounded-2xl border border-brand-accent/40 bg-canvas-warm/30 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-brand-accent/20">
                    <span className="text-xs font-bold uppercase tracking-wider text-brand-primary">
                      👑 Head of Household Profile
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Verified Contact
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                    <div className="w-14 h-14 rounded-full overflow-hidden bg-gradient-to-br from-[#fff7dd] to-[#fae8b2] border border-brand-accent flex items-center justify-center text-lg font-bold text-brand-primary shrink-0">
                      {headPhotoUrl ? (
                        <img src={headPhotoUrl} alt={headName} className="w-full h-full object-cover" />
                      ) : (
                        headName ? headName.charAt(0) : "H"
                      )}
                    </div>

                    <div className="flex-1 text-center sm:text-left text-xs space-y-1">
                      <h3 className="text-sm font-extrabold text-brand-primary">
                        {headName} {headAge !== null && <span className="font-normal text-xs text-body-muted font-sans">({headAge} yrs)</span>}
                      </h3>
                      <p className="text-body-heading font-medium">
                        Father: <strong>{headFatherName}</strong> • Gotra: <strong className="text-brand-gold font-devanagari">{gotra}</strong>
                      </p>
                      <p className="text-body-muted">
                        Native Place: <strong>{nativePlace}</strong> • Profession: <strong>{headProfessionTitle}</strong>
                      </p>
                      <p className="text-body-muted">
                        Address: <strong>{fullAddress}, {city}, {state} ({country}) - {postalCode}</strong>
                      </p>
                      <p className="text-brand-primary font-mono text-[11px] font-bold pt-1">
                        {isIndia ? `Aadhaar: ${maskGovtId(aadhaarNumber)} • PAN: ${maskGovtId(panNumber)}` : `Passport: ${maskGovtId(passportNumber)} • Govt ID: ${maskGovtId(govtIdNumber)}`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. Additional Members Summary */}
                <div className="p-4 sm:p-5 rounded-2xl border border-brand-accent/30 bg-canvas-warm/20 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-brand-accent/20">
                    <span className="text-xs font-bold uppercase tracking-wider text-brand-primary">
                      👨‍👩‍👧‍👦 Additional Family Members ({additionalMembers.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="text-[11px] font-bold text-brand-primary hover:underline"
                    >
                      ✏️ Edit Members
                    </button>
                  </div>

                  {additionalMembers.length === 0 ? (
                    <p className="text-xs text-body-muted italic py-2">
                      None added (Registering as single-member Head of Household).
                    </p>
                  ) : (
                    <div className="space-y-2 text-xs">
                      {additionalMembers.map((m, idx) => (
                        <div
                          key={m.id}
                          className="p-3 rounded-xl bg-white border border-brand-accent/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                        >
                          <div>
                            <span className="font-bold text-brand-primary">{idx + 1}. {m.fullName}</span>
                            <span className="text-body-muted ml-2">({m.relationToHead})</span>
                            <span className="text-body-muted ml-2">• DOB: {m.dob}</span>
                          </div>
                          <div className="text-[11px] text-body-muted">
                            {m.professionTitle || m.profession || "Unspecified"}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3. Consent Box */}
                <div className="p-4 rounded-2xl bg-amber-50 border border-brand-gold/40 text-xs">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={consentGiven}
                      onChange={(e) => setConsentGiven(e.target.checked)}
                      className="mt-0.5 rounded text-brand-primary focus:ring-brand-primary border-brand-accent"
                    />
                    <span className="text-body-text leading-relaxed">
                      I confirm that all information provided is accurate and complies with the community charter of the <strong>Maharaja Agrasen Foundation Limited Singapore</strong>. I consent to my family&apos;s inclusion in the global directory after verification.
                    </span>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col-reverse sm:flex-row justify-between gap-3 pt-4 border-t border-brand-accent/20">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-full text-xs font-bold text-body-heading bg-canvas-warm hover:bg-white border border-brand-accent/30 transition-all"
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
