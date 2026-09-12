'use client';

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getEligibleHouseholdMembers, createMatrimonialProfile } from "@/actions/matrimony";
import { optimizeImageForUpload } from "@/lib/image-optimizer";
import type {
  EligibleHouseholdMember,
  LinkedFamilyMember,
  CustomField,
  CreateMatrimonialProfileInput,
} from "@/types/matrimony";

const HEIGHT_PRESETS = [
  { cm: 140, label: "4' 7\" (140 cm)" },
  { cm: 145, label: "4' 9\" (145 cm)" },
  { cm: 150, label: "4' 11\" (150 cm)" },
  { cm: 152, label: "5' 0\" (152 cm)" },
  { cm: 155, label: "5' 1\" (155 cm)" },
  { cm: 157, label: "5' 2\" (157 cm)" },
  { cm: 160, label: "5' 3\" (160 cm)" },
  { cm: 162, label: "5' 4\" (162 cm)" },
  { cm: 165, label: "5' 5\" (165 cm)" },
  { cm: 168, label: "5' 6\" (168 cm)" },
  { cm: 170, label: "5' 7\" (170 cm)" },
  { cm: 173, label: "5' 8\" (173 cm)" },
  { cm: 175, label: "5' 9\" (175 cm)" },
  { cm: 178, label: "5' 10\" (178 cm)" },
  { cm: 180, label: "5' 11\" (180 cm)" },
  { cm: 183, label: "6' 0\" (183 cm)" },
  { cm: 185, label: "6' 1\" (185 cm)" },
  { cm: 188, label: "6' 2\" (188 cm)" },
  { cm: 191, label: "6' 3\" (191 cm)" },
  { cm: 195, label: "6' 5\" (195 cm)" },
];

const EDUCATION_CATEGORIES = [
  "Doctorate / PhD",
  "Masters / Post Graduate (MBA/M.Tech/MS/MA)",
  "Bachelors / Graduate (B.Tech/BE/BBA/B.Com)",
  "Chartered Accountant (CA/CS/CFA)",
  "Medical (MBBS/MD/MS/BDS)",
  "Legal (LLB/LLM)",
  "Civil Services (IAS/IPS/IRS)",
  "Diploma",
  "High School",
];

const SECTOR_CATEGORIES = [
  "Private Company / Corporate",
  "Business / Self-Employed Entrepreneur",
  "Government / Public Sector / PSU",
  "Civil Services / Administration",
  "Banking / Financial Services",
  "Medical / Healthcare Practice",
  "Education / Academia",
  "Not Working",
];

const INCOME_OPTIONS = [
  "Not Specified",
  "Under ₹5 Lakhs",
  "₹5 - 10 Lakhs",
  "₹10 - 15 Lakhs",
  "₹15 - 25 Lakhs",
  "₹25 - 50 Lakhs",
  "₹50 - 75 Lakhs",
  "₹75 Lakhs - 1 Crore",
  "₹1 Crore +",
  "$100,000 - $150,000 USD",
  "$150,000 - $250,000 USD",
  "$250,000+ USD",
];

function CreateMatrimonyProfileForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedMemberId = searchParams.get("memberId") || "";

  // Data Loading States
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successResult, setSuccessResult] = useState<{ profileId: string; candidateName: string } | null>(null);

  // Household data
  const [eligibleMembers, setEligibleMembers] = useState<EligibleHouseholdMember[]>([]);
  const [householdGotra, setHouseholdGotra] = useState("");
  const [householdNativePlace, setHouseholdNativePlace] = useState("");

  // Step 1: Candidate Selection
  const [selectedMemberId, setSelectedMemberId] = useState(preselectedMemberId);
  const [selectedMember, setSelectedMember] = useState<EligibleHouseholdMember | null>(null);

  // Step 2: Personal & Physical (auto-fills where available)
  const [createdFor, setCreatedFor] = useState<any>("Self");
  const [maritalStatus, setMaritalStatus] = useState<any>("Never Married");
  const [dob, setDob] = useState("");
  const [placeOfBirth, setPlaceOfBirth] = useState("");
  const [heightCm, setHeightCm] = useState<number>(170);
  const [weightBuild, setWeightBuild] = useState("Average");
  const [complexion, setComplexion] = useState("Fair");
  const [bloodGroup, setBloodGroup] = useState("");
  const [motherTongue, setMotherTongue] = useState("Hindi");
  const [languagesSpoken, setLanguagesSpoken] = useState("Hindi, English");
  const [diet, setDiet] = useState("Vegetarian");
  const [smokeDrink, setSmokeDrink] = useState("Non-Smoker / Non-Drinker");
  const [physicalStatus, setPhysicalStatus] = useState("Normal");
  const [aboutMe, setAboutMe] = useState("");

  // Step 3: Education & Career
  const [highestEducation, setHighestEducation] = useState("Bachelors / Graduate (B.Tech/BE/BBA/B.Com)");
  const [degreeName, setDegreeName] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const [schoolingHonors, setSchoolingHonors] = useState("");
  const [employmentSector, setEmploymentSector] = useState("Private Company / Corporate");
  const [occupationTitle, setOccupationTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [annualIncome, setAnnualIncome] = useState("₹15 - 25 Lakhs");
  const [workCity, setWorkCity] = useState("");
  const [workCountry, setWorkCountry] = useState("India");
  const [willingToRelocate, setWillingToRelocate] = useState("Yes");

  // Step 4: Family Details & Linking
  const [fatherName, setFatherName] = useState("");
  const [fatherMemberId, setFatherMemberId] = useState("");
  const [fatherOccupation, setFatherOccupation] = useState("Business Owner");
  const [motherName, setMotherName] = useState("");
  const [motherMemberId, setMotherMemberId] = useState("");
  const [motherOccupation, setMotherOccupation] = useState("Homemaker");
  const [siblings, setSiblings] = useState<LinkedFamilyMember[]>([]);
  const [familyType, setFamilyType] = useState<"Nuclear" | "Joint">("Nuclear");
  const [familyValues, setFamilyValues] = useState<"Traditional" | "Moderate" | "Liberal">("Traditional");
  const [familyFinancialStatus, setFamilyFinancialStatus] = useState("Upper Middle Class");
  const [aboutFamily, setAboutFamily] = useState("");

  // Step 5: Dynamic Custom Fields
  const [customFields, setCustomFields] = useState<CustomField[]>([]);

  // Step 6: Photos (2-3 Photos)
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoUploading, setPhotoUploading] = useState(false);

  // Step 7: Partner Preferences & Contact
  const [prefMinAge, setPrefMinAge] = useState("21");
  const [prefMaxAge, setPrefMaxAge] = useState("30");
  const [prefMinHeight, setPrefMinHeight] = useState("155");
  const [prefMaxHeight, setPrefMaxHeight] = useState("185");
  const [prefEducation, setPrefEducation] = useState("");
  const [prefSector, setPrefSector] = useState("");
  const [prefNotes, setPrefNotes] = useState("");

  const [contactPerson, setContactPerson] = useState("");
  const [contactRelation, setContactRelation] = useState("Father");
  const [contactPhone, setContactPhone] = useState("");
  const [secondaryPhone, setSecondaryPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [residentialAddress, setResidentialAddress] = useState("");
  const [referencedBy, setReferencedBy] = useState("");

  // Load Household & Eligible Members
  useEffect(() => {
    async function load() {
      setIsLoading(true);
      const res = await getEligibleHouseholdMembers();
      if (!res.success) {
        setErrorMessage(res.error || "Failed to load household members.");
        setIsLoading(false);
        return;
      }
      setEligibleMembers(res.members || []);
      setHouseholdGotra(res.householdGotra || "Garg");
      setHouseholdNativePlace(res.householdNativePlace || "");

      // Auto-select member if preselected or if only 1 member available
      const target =
        res.members?.find((m) => m.id === preselectedMemberId) ||
        (res.members && res.members.length === 1 ? res.members[0] : null);

      if (target) {
        applySelectedMember(target);
      }
      setIsLoading(false);
    }
    load();
  }, [preselectedMemberId]);

  function applySelectedMember(m: EligibleHouseholdMember) {
    setSelectedMemberId(m.id);
    setSelectedMember(m);
    setDob(m.dob || "");
    setWorkCity(m.currentCity || "");
    setWorkCountry(m.currentCountry || "India");
    setOccupationTitle(m.professionTitle || m.profession || "");
    setCompanyName(m.companyName || "");
    setContactPhone(m.phone || "");
    setContactEmail(m.email || "");

    // Pre-populate photo if member already has one
    if (m.photoUrl && photos.length === 0) {
      setPhotos([m.photoUrl]);
    }

    // Guess "Created For"
    const rel = (m.relationToHead || "").toLowerCase();
    if (rel === "self") {
      setCreatedFor("Self");
      setContactPerson(m.fullName);
      setContactRelation("Self");
    } else if (rel === "son") {
      setCreatedFor("Son");
      setContactRelation("Father");
    } else if (rel === "daughter") {
      setCreatedFor("Daughter");
      setContactRelation("Father");
    } else {
      setCreatedFor("Relative");
      setContactRelation("Guardian");
    }
  }

  // Handle Photo Upload
  const handleAddPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (photos.length >= 3) {
      alert("A maximum of 3 photos is permitted for matrimonial biodatas.");
      return;
    }
    try {
      setPhotoUploading(true);
      const optimized = await optimizeImageForUpload(file, 600, 0.85);
      setPhotos((prev) => [...prev, optimized]);
    } catch (err: any) {
      alert(err?.message || "Failed to process photo.");
    } finally {
      setPhotoUploading(false);
      e.target.value = "";
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  // Sibling Helpers
  const handleAddSibling = () => {
    setSiblings((prev) => [
      ...prev,
      {
        name: "",
        relation: "brother",
        relationLabel: "Brother",
        maritalStatus: "unmarried",
        occupation: "",
      },
    ]);
  };

  const handleRemoveSibling = (index: number) => {
    setSiblings((prev) => prev.filter((_, i) => i !== index));
  };

  // Custom Fields Helpers
  const handleAddCustomField = () => {
    setCustomFields((prev) => [
      ...prev,
      { id: Math.random().toString(36).substring(2, 9), label: "", value: "" },
    ]);
  };

  const handleRemoveCustomField = (id: string) => {
    setCustomFields((prev) => prev.filter((f) => f.id !== id));
  };

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) {
      setErrorMessage("Please select an eligible family member to create a profile.");
      return;
    }
    if (selectedMember.hasMatrimonialProfile) {
      setErrorMessage("This member already has an active matrimonial profile.");
      return;
    }
    if (photos.length === 0) {
      setErrorMessage("Please upload at least 1 portrait photograph for the matrimonial biodata.");
      return;
    }
    if (!fatherName.trim() || !motherName.trim()) {
      setErrorMessage("Both Father's name and Mother's name are required.");
      return;
    }
    if (!contactPerson.trim() || !contactPhone.trim()) {
      setErrorMessage("Family contact person and phone number are required.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    const payload: CreateMatrimonialProfileInput = {
      memberId: selectedMember.id,
      createdFor,
      maritalStatus,
      dob,
      placeOfBirth,
      heightCm: Number(heightCm) || undefined,
      weightBuild,
      complexion,
      bloodGroup: bloodGroup || undefined,
      motherTongue,
      languagesSpoken: languagesSpoken.split(",").map((s) => s.trim()).filter(Boolean),
      diet,
      smokeDrink,
      physicalStatus,
      aboutMe,

      highestEducation,
      degreeName,
      collegeName,
      schoolingHonors,
      employmentSector,
      occupationTitle,
      companyName,
      annualIncome,
      workCity,
      workCountry,
      willingToRelocate,

      fatherName,
      fatherMemberId: fatherMemberId || undefined,
      fatherOccupation,
      motherName,
      motherMemberId: motherMemberId || undefined,
      motherOccupation,
      linkedSiblings: siblings.filter((s) => s.name.trim()),
      nativePlace: householdNativePlace,
      familyLocation: `${workCity || "Delhi"}, ${workCountry || "India"}`,
      familyType,
      familyValues,
      familyFinancialStatus,
      aboutFamily,

      customFields: customFields.filter((f) => f.label.trim() && f.value.trim()),
      photos,

      partnerPreferences: {
        minAge: prefMinAge ? parseInt(prefMinAge, 10) : undefined,
        maxAge: prefMaxAge ? parseInt(prefMaxAge, 10) : undefined,
        minHeightCm: prefMinHeight ? parseInt(prefMinHeight, 10) : undefined,
        maxHeightCm: prefMaxHeight ? parseInt(prefMaxHeight, 10) : undefined,
        notes: prefNotes,
      },

      contactPerson,
      contactRelation,
      contactPhone,
      secondaryPhone,
      contactEmail,
      residentialAddress,
      referencedBy: referencedBy.trim() || undefined,
    };

    const res = await createMatrimonialProfile(payload);
    setIsSubmitting(false);

    if (res.success && res.profileId) {
      setSuccessResult({ profileId: res.profileId, candidateName: selectedMember.fullName });
    } else {
      setErrorMessage(res.error || "Failed to create profile. Please check all fields.");
    }
  };

  if (isLoading) {
    return (
      <main className="py-16 bg-canvas-page min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-bold text-body-muted">Loading household candidate registry...</p>
        </div>
      </main>
    );
  }

  // Success Confirmation Screen
  if (successResult) {
    return (
      <main className="py-12 sm:py-16 bg-canvas-page min-h-[75vh] flex items-center justify-center px-4">
        <div className="max-w-xl w-full bg-white border-2 border-emerald-300 rounded-3xl p-6 sm:p-10 shadow-warmLg text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-300 text-emerald-700 flex items-center justify-center text-3xl mx-auto">
            ✓
          </div>
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Profile Registered &amp; Verified
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl font-black text-brand-primary mt-3">
              Matrimonial Profile Active!
            </h1>
            <p className="text-xs sm:text-sm text-body-muted leading-relaxed mt-2 max-w-md mx-auto">
              The matrimonial profile for <strong>{successResult.candidateName}</strong> under the <strong>{householdGotra}</strong> Gotra is now searchable by verified community members.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/80 border border-brand-accent/30 text-xs text-amber-900 text-left space-y-1">
            <strong>Security &amp; Transparency Notice:</strong>
            <p className="text-[11px] text-body-muted">
              An automated confirmation alert has been dispatched to {successResult.candidateName}&apos;s email and all linked family members. The candidate has direct self-governance to edit, pause, or hide this profile anytime.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href={`/matrimony/${successResult.profileId}`}
              className="w-full sm:w-auto px-6 py-2.5 rounded-full text-xs font-bold text-white bg-brand-primary hover:bg-brand-burgundy transition shadow-warm"
            >
              View Biodata Now →
            </Link>
            <Link
              href="/matrimony"
              className="w-full sm:w-auto px-6 py-2.5 rounded-full text-xs font-bold text-brand-primary bg-canvas-warm border border-brand-accent transition hover:bg-canvas-warm/80"
            >
              Browse Matrimony Hub
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="py-8 sm:py-12 bg-canvas-page min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/matrimony"
            className="text-xs font-bold text-brand-primary hover:underline flex items-center gap-1.5"
          >
            <span>←</span>
            <span>Back to Matrimonial Directory</span>
          </Link>
          <span className="text-xs font-mono font-bold text-brand-gold bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
            Gotra: {householdGotra}
          </span>
        </div>

        {/* Title Card */}
        <div className="bg-white border border-brand-accent/40 rounded-3xl p-6 sm:p-8 shadow-warm space-y-2">
          <span className="text-xs font-extrabold uppercase tracking-widest text-brand-gold bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
            Candidate Profile Builder • बायोडाटा प्रपत्र
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-black text-brand-primary">
            Register Agarwal Matrimonial Profile
          </h1>
          <p className="text-xs sm:text-sm text-body-muted leading-relaxed">
            Please fill out candidate details with utmost accuracy. The candidate must be a registered member of your verified household. Existing verified data will be auto-filled automatically.
          </p>
        </div>

        {errorMessage && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-300 text-xs font-bold text-red-800 flex items-center gap-2">
            <span>⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* SECTION 1: CANDIDATE SELECTION (MANDATORY MEMBERSHIP & AUTO-FILL) */}
          <div className="bg-white border border-brand-accent/30 rounded-3xl p-6 sm:p-8 shadow-warm space-y-5">
            <div className="border-b border-brand-accent/20 pb-3">
              <h2 className="font-serif text-lg font-bold text-brand-primary">
                1. Select Candidate Member (सदस्य चयन)
              </h2>
              <p className="text-xs text-body-muted mt-0.5">
                Select an eligible unmarried adult member from your verified household.
              </p>
            </div>

            {eligibleMembers.length === 0 ? (
              <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
                <p className="font-bold">No eligible unmarried adult members found in your household.</p>
                <p className="text-body-muted">
                  All current members in your household are either already marked as married or already have an active matrimonial profile. To register a profile for a son or daughter, please first add them as a member from your Dashboard.
                </p>
                <Link
                  href="/dashboard"
                  className="inline-block mt-2 px-4 py-1.5 rounded-full text-xs font-bold text-white bg-brand-primary"
                >
                  Go to Dashboard → Add Family Member
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-body-heading">
                  Choose Household Member *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {eligibleMembers.map((m) => {
                    const isSelected = selectedMemberId === m.id;
                    const hasProfile = m.hasMatrimonialProfile;
                    return (
                      <div
                        key={m.id}
                        onClick={() => {
                          if (!hasProfile) applySelectedMember(m);
                        }}
                        className={`p-4 rounded-2xl border-2 transition-all flex items-start gap-3 ${
                          hasProfile
                            ? "opacity-60 bg-gray-50 border-gray-200 cursor-not-allowed"
                            : isSelected
                            ? "bg-amber-50/70 border-brand-primary shadow-xs cursor-pointer"
                            : "bg-canvas-warm/30 border-brand-accent/30 hover:border-brand-accent cursor-pointer"
                        }`}
                      >
                        <input
                          type="radio"
                          name="candidateMember"
                          checked={isSelected}
                          disabled={hasProfile}
                          readOnly
                          className="mt-1 text-brand-primary focus:ring-brand-primary"
                        />
                        <div className="min-w-0 flex-1 text-xs">
                          <div className="flex items-center justify-between">
                            <strong className="text-brand-primary text-sm truncate">{m.fullName}</strong>
                            <span className="text-[10px] font-mono font-bold text-brand-gold bg-amber-100/70 px-1.5 py-0.5 rounded">
                              {m.relationToHead}
                            </span>
                          </div>
                          <p className="text-body-muted truncate mt-0.5">
                            {m.gender} • {m.dob ? `${m.dob}` : "DOB on file"}
                          </p>
                          {hasProfile ? (
                            <span className="inline-block text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full mt-1.5">
                              ✓ Profile Already Active
                            </span>
                          ) : (
                            <span className="inline-block text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full mt-1.5">
                              Eligible for Matrimony
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {selectedMember && (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
                    <span>✓</span>
                    <span>
                      <strong>Auto-filled:</strong> {selectedMember.fullName}&apos;s verified Gotra (
                      {householdGotra}), native roots ({householdNativePlace}), and contact have been pre-populated below.
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SECTION 2: IDENTITY & PHYSICAL ATTRIBUTES */}
          <div className="bg-white border border-brand-accent/30 rounded-3xl p-6 sm:p-8 shadow-warm space-y-5">
            <div className="border-b border-brand-accent/20 pb-3">
              <h2 className="font-serif text-lg font-bold text-brand-primary">
                2. Personal &amp; Physical Attributes (व्यक्तिगत विवरण)
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-body-heading mb-1.5">
                  Profile Managed By *
                </label>
                <select
                  value={createdFor}
                  onChange={(e) => setCreatedFor(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-brand-accent/40 bg-canvas-warm/30 font-semibold"
                >
                  <option value="Self">Self (स्वयं)</option>
                  <option value="Son">Parents (पुत्र हेतु)</option>
                  <option value="Daughter">Parents (पुत्री हेतु)</option>
                  <option value="Brother">Sibling (भाई हेतु)</option>
                  <option value="Sister">Sibling (बहन हेतु)</option>
                  <option value="Relative">Relative / Guardian</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-body-heading mb-1.5">
                  Marital Status *
                </label>
                <select
                  value={maritalStatus}
                  onChange={(e) => setMaritalStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-brand-accent/40 bg-canvas-warm/30 font-semibold"
                >
                  <option value="Never Married">Never Married (अविवाहित)</option>
                  <option value="Divorced">Divorced (तलाकशुदा)</option>
                  <option value="Widowed">Widowed (विधुर / विधवा)</option>
                  <option value="Awaiting Divorce">Awaiting Divorce</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-body-heading mb-1.5">
                  Date of Birth *
                </label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-brand-accent/40 bg-canvas-warm/30 font-semibold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-body-heading mb-1.5">
                  Height *
                </label>
                <select
                  value={heightCm}
                  onChange={(e) => setHeightCm(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-brand-accent/40 bg-canvas-warm/30 font-semibold cursor-pointer"
                >
                  {HEIGHT_PRESETS.map((h) => (
                    <option key={h.cm} value={h.cm}>
                      {h.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-body-heading mb-1.5">
                  Place of Birth (जन्म स्थान)
                </label>
                <input
                  type="text"
                  value={placeOfBirth}
                  onChange={(e) => setPlaceOfBirth(e.target.value)}
                  placeholder="City, State (e.g. Jaipur, Rajasthan)"
                  className="w-full px-3 py-2 rounded-xl border border-brand-accent/40 bg-canvas-warm/30"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-body-heading mb-1.5">
                  Complexion
                </label>
                <select
                  value={complexion}
                  onChange={(e) => setComplexion(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-brand-accent/40 bg-canvas-warm/30"
                >
                  <option value="Fair">Fair (गोरा)</option>
                  <option value="Very Fair">Very Fair (अति गोरा)</option>
                  <option value="Wheatish">Wheatish (गेहुंआ)</option>
                  <option value="Dusky">Dusky (सांवला)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-body-heading mb-1.5">
                  Dietary Habits (खान-पान) *
                </label>
                <select
                  value={diet}
                  onChange={(e) => setDiet(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-brand-accent/40 bg-canvas-warm/30 font-semibold"
                >
                  <option value="Vegetarian">Strict Vegetarian (शुद्ध शाकाहारी)</option>
                  <option value="Jain Vegetarian">Jain Vegetarian (जैन शाकाहारी)</option>
                  <option value="Eggetarian">Eggetarian</option>
                  <option value="Vegan">Vegan</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-body-heading mb-1.5">
                  Smoking / Drinking Habits
                </label>
                <select
                  value={smokeDrink}
                  onChange={(e) => setSmokeDrink(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-brand-accent/40 bg-canvas-warm/30"
                >
                  <option value="Non-Smoker / Non-Drinker">Non-Smoker / Non-Drinker (नशामुक्त)</option>
                  <option value="Occasional">Occasional / Social</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-body-heading mb-1.5">
                  Blood Group
                </label>
                <select
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-brand-accent/40 bg-canvas-warm/30"
                >
                  <option value="">Select / Don&apos;t Know</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-body-heading mb-1.5">
                About Me / Personality &amp; Hobbies (परिचय एवं रुचियां)
              </label>
              <textarea
                rows={3}
                value={aboutMe}
                onChange={(e) => setAboutMe(e.target.value)}
                placeholder="Describe candidate's nature, personal values, life outlook, hobbies, interests, and creative passions..."
                className="w-full p-3 rounded-2xl border border-brand-accent/40 bg-canvas-warm/30 text-xs focus:outline-none focus:ring-2 focus:ring-brand-primary"
              ></textarea>
            </div>
          </div>

          {/* SECTION 3: EDUCATION & PROFESSION */}
          <div className="bg-white border border-brand-accent/30 rounded-3xl p-6 sm:p-8 shadow-warm space-y-5">
            <div className="border-b border-brand-accent/20 pb-3">
              <h2 className="font-serif text-lg font-bold text-brand-primary">
                3. Education &amp; Career Details (शिक्षा एवं व्यवसाय)
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-body-heading mb-1.5">
                  Highest Qualification *
                </label>
                <select
                  value={highestEducation}
                  onChange={(e) => setHighestEducation(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-brand-accent/40 bg-canvas-warm/30 font-semibold cursor-pointer"
                >
                  {EDUCATION_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-body-heading mb-1.5">
                  Degree Name &amp; Specialization
                </label>
                <input
                  type="text"
                  value={degreeName}
                  onChange={(e) => setDegreeName(e.target.value)}
                  placeholder="e.g. B.Tech in Computer Science, MBA"
                  className="w-full px-3 py-2 rounded-xl border border-brand-accent/40 bg-canvas-warm/30"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-body-heading mb-1.5">
                  College / University Name
                </label>
                <input
                  type="text"
                  value={collegeName}
                  onChange={(e) => setCollegeName(e.target.value)}
                  placeholder="e.g. IIT Delhi, BITS Pilani, Delhi Univ"
                  className="w-full px-3 py-2 rounded-xl border border-brand-accent/40 bg-canvas-warm/30"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-body-heading mb-1.5">
                  Employment Sector *
                </label>
                <select
                  value={employmentSector}
                  onChange={(e) => setEmploymentSector(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-brand-accent/40 bg-canvas-warm/30 font-semibold cursor-pointer"
                >
                  {SECTOR_CATEGORIES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-body-heading mb-1.5">
                  Occupation Title / Designation *
                </label>
                <input
                  type="text"
                  value={occupationTitle}
                  onChange={(e) => setOccupationTitle(e.target.value)}
                  placeholder="e.g. Senior Software Engineer, Director, CA"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-brand-accent/40 bg-canvas-warm/30 font-semibold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-body-heading mb-1.5">
                  Company / Organization Name
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Google, Family Enterprise, Govt"
                  className="w-full px-3 py-2 rounded-xl border border-brand-accent/40 bg-canvas-warm/30"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-body-heading mb-1.5">
                  Annual Income Range
                </label>
                <select
                  value={annualIncome}
                  onChange={(e) => setAnnualIncome(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-brand-accent/40 bg-canvas-warm/30 font-semibold"
                >
                  {INCOME_OPTIONS.map((inc) => (
                    <option key={inc} value={inc}>
                      {inc}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-body-heading mb-1.5">
                  Work City &amp; Location
                </label>
                <input
                  type="text"
                  value={workCity}
                  onChange={(e) => setWorkCity(e.target.value)}
                  placeholder="e.g. Bengaluru, Singapore, London"
                  className="w-full px-3 py-2 rounded-xl border border-brand-accent/40 bg-canvas-warm/30"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-body-heading mb-1.5">
                  Willingness to Relocate
                </label>
                <select
                  value={willingToRelocate}
                  onChange={(e) => setWillingToRelocate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-brand-accent/40 bg-canvas-warm/30"
                >
                  <option value="Yes">Yes (हाँ)</option>
                  <option value="No">No (नहीं)</option>
                  <option value="Within Country Only">Within Country Only</option>
                  <option value="Abroad Only">Abroad Only</option>
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 4: FAMILY DETAILS & INTERACTIVE MEMBER LINKING */}
          <div className="bg-white border border-brand-accent/30 rounded-3xl p-6 sm:p-8 shadow-warm space-y-6">
            <div className="border-b border-brand-accent/20 pb-3">
              <h2 className="font-serif text-lg font-bold text-brand-primary">
                4. Family Background &amp; Interactive Member Linking (पारिवारिक पृष्ठभूमि)
              </h2>
              <p className="text-xs text-body-muted mt-0.5">
                Link existing verified members from your household so visitors can click through to verify your family roots in the community directory.
              </p>
            </div>

            {/* Father Details & Link */}
            <div className="p-4 rounded-2xl bg-canvas-warm/40 border border-brand-accent/30 space-y-3">
              <span className="text-xs font-bold text-brand-primary uppercase tracking-wider block">
                Father&apos;s Information (पिताजी का विवरण)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-extrabold text-body-heading mb-1">
                    Father&apos;s Full Name *
                  </label>
                  <input
                    type="text"
                    value={fatherName}
                    onChange={(e) => setFatherName(e.target.value)}
                    placeholder="Shri..."
                    required
                    className="w-full px-3 py-2 rounded-xl border border-brand-accent/40 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-body-heading mb-1">
                    Father&apos;s Occupation
                  </label>
                  <input
                    type="text"
                    value={fatherOccupation}
                    onChange={(e) => setFatherOccupation(e.target.value)}
                    placeholder="e.g. Business, Retired Govt Officer"
                    className="w-full px-3 py-2 rounded-xl border border-brand-accent/40 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-body-heading mb-1">
                    Link Member Profile (Directory)
                  </label>
                  <select
                    value={fatherMemberId}
                    onChange={(e) => setFatherMemberId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-brand-accent/40 bg-white cursor-pointer"
                  >
                    <option value="">-- No Link / Enter Manually --</option>
                    {eligibleMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.fullName} ({m.relationToHead})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Mother Details & Link */}
            <div className="p-4 rounded-2xl bg-canvas-warm/40 border border-brand-accent/30 space-y-3">
              <span className="text-xs font-bold text-brand-primary uppercase tracking-wider block">
                Mother&apos;s Information (माताजी का विवरण)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-extrabold text-body-heading mb-1">
                    Mother&apos;s Full Name *
                  </label>
                  <input
                    type="text"
                    value={motherName}
                    onChange={(e) => setMotherName(e.target.value)}
                    placeholder="Smt..."
                    required
                    className="w-full px-3 py-2 rounded-xl border border-brand-accent/40 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-body-heading mb-1">
                    Mother&apos;s Occupation
                  </label>
                  <input
                    type="text"
                    value={motherOccupation}
                    onChange={(e) => setMotherOccupation(e.target.value)}
                    placeholder="e.g. Homemaker, Teacher, Doctor"
                    className="w-full px-3 py-2 rounded-xl border border-brand-accent/40 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-body-heading mb-1">
                    Link Member Profile (Directory)
                  </label>
                  <select
                    value={motherMemberId}
                    onChange={(e) => setMotherMemberId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-brand-accent/40 bg-white cursor-pointer"
                  >
                    <option value="">-- No Link / Enter Manually --</option>
                    {eligibleMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.fullName} ({m.relationToHead})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Siblings Repeater */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-body-heading uppercase tracking-wider">
                  Siblings (भाई एवं बहन)
                </span>
                <button
                  type="button"
                  onClick={handleAddSibling}
                  className="text-xs font-bold text-brand-primary hover:underline flex items-center gap-1"
                >
                  <span>+</span>
                  <span>Add Sibling</span>
                </button>
              </div>

              {siblings.map((sib, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-canvas-warm/30 border border-brand-accent/30 grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs items-end"
                >
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-body-muted mb-1">
                      Sibling Name
                    </label>
                    <input
                      type="text"
                      value={sib.name}
                      onChange={(e) => {
                        const copy = [...siblings];
                        copy[idx].name = e.target.value;
                        setSiblings(copy);
                      }}
                      placeholder="Name..."
                      className="w-full px-2.5 py-1.5 rounded-xl border border-brand-accent/40 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-body-muted mb-1">
                      Relation
                    </label>
                    <select
                      value={sib.relation}
                      onChange={(e) => {
                        const copy = [...siblings];
                        copy[idx].relation = e.target.value as any;
                        setSiblings(copy);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-brand-accent/40 bg-white"
                    >
                      <option value="brother">Brother (भाई)</option>
                      <option value="sister">Sister (बहन)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-body-muted mb-1">
                      Marital Status
                    </label>
                    <select
                      value={sib.maritalStatus}
                      onChange={(e) => {
                        const copy = [...siblings];
                        copy[idx].maritalStatus = e.target.value as any;
                        setSiblings(copy);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-brand-accent/40 bg-white"
                    >
                      <option value="unmarried">Unmarried</option>
                      <option value="married">Married</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <label className="block text-[10px] font-extrabold uppercase text-body-muted mb-1">
                        Link Member
                      </label>
                      <select
                        value={sib.memberId || ""}
                        onChange={(e) => {
                          const copy = [...siblings];
                          copy[idx].memberId = e.target.value || undefined;
                          setSiblings(copy);
                        }}
                        className="w-full px-2 py-1.5 rounded-xl border border-brand-accent/40 bg-white text-[11px]"
                      >
                        <option value="">None</option>
                        {eligibleMembers.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.fullName}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveSibling(idx)}
                      className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 text-xs shrink-0"
                      title="Remove"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Family Type & Financial Status */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-2">
              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-body-heading mb-1.5">
                  Family Type
                </label>
                <select
                  value={familyType}
                  onChange={(e) => setFamilyType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-brand-accent/40 bg-canvas-warm/30"
                >
                  <option value="Nuclear">Nuclear Family (एकल परिवार)</option>
                  <option value="Joint">Joint Family (संयुक्त परिवार)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-body-heading mb-1.5">
                  Family Values
                </label>
                <select
                  value={familyValues}
                  onChange={(e) => setFamilyValues(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-brand-accent/40 bg-canvas-warm/30"
                >
                  <option value="Traditional">Traditional (पारंपरिक)</option>
                  <option value="Moderate">Moderate (मध्यममार्गी)</option>
                  <option value="Liberal">Liberal / Modern</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-body-heading mb-1.5">
                  Family Standing / Financial Status
                </label>
                <select
                  value={familyFinancialStatus}
                  onChange={(e) => setFamilyFinancialStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-brand-accent/40 bg-canvas-warm/30"
                >
                  <option value="Middle Class">Middle Class</option>
                  <option value="Upper Middle Class">Upper Middle Class</option>
                  <option value="Affluent">Affluent / Well-to-do</option>
                  <option value="High Net Worth">High Net Worth (HNW)</option>
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 5: DYNAMIC CUSTOM FIELDS */}
          <div className="bg-white border border-brand-accent/30 rounded-3xl p-6 sm:p-8 shadow-warm space-y-4">
            <div className="flex items-center justify-between border-b border-brand-accent/20 pb-3">
              <div>
                <h2 className="font-serif text-lg font-bold text-brand-primary">
                  5. Dynamic Custom Fields (अतिरिक्त विशेष विवरण)
                </h2>
                <p className="text-xs text-body-muted mt-0.5">
                  Add any custom field of your choice (e.g. Visa Status, Commercial Property, Sports Talents, Spiritual Affiliation).
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddCustomField}
                className="px-3.5 py-1.5 rounded-full text-xs font-bold text-brand-primary bg-canvas-warm border border-brand-accent hover:bg-canvas-warm/80 shrink-0"
              >
                + Add Custom Field
              </button>
            </div>

            {customFields.length === 0 ? (
              <p className="text-xs text-body-muted italic">
                No custom fields added yet. Click &quot;+ Add Custom Field&quot; if you wish to list additional family assets, overseas residency, or personal honors.
              </p>
            ) : (
              <div className="space-y-3">
                {customFields.map((f, idx) => (
                  <div
                    key={f.id}
                    className="p-3.5 rounded-2xl bg-canvas-warm/30 border border-brand-accent/30 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 text-xs"
                  >
                    <div className="w-full sm:w-1/3">
                      <label className="block text-[10px] font-extrabold uppercase text-body-muted mb-1">
                        Field Name
                      </label>
                      <input
                        type="text"
                        value={f.label}
                        onChange={(e) => {
                          const copy = [...customFields];
                          copy[idx].label = e.target.value;
                          setCustomFields(copy);
                        }}
                        placeholder="e.g. Visa / Green Card"
                        className="w-full px-3 py-1.5 rounded-xl border border-brand-accent/40 bg-white"
                      />
                    </div>

                    <div className="flex-1">
                      <label className="block text-[10px] font-extrabold uppercase text-body-muted mb-1">
                        Details / Value
                      </label>
                      <input
                        type="text"
                        value={f.value}
                        onChange={(e) => {
                          const copy = [...customFields];
                          copy[idx].value = e.target.value;
                          setCustomFields(copy);
                        }}
                        placeholder="e.g. US H1-B Visa valid till 2028"
                        className="w-full px-3 py-1.5 rounded-xl border border-brand-accent/40 bg-white"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveCustomField(f.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold self-end sm:self-auto"
                      title="Remove field"
                    >
                      ✕ Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION 6: PHOTOS (2-3 PHOTOS) */}
          <div className="bg-white border border-brand-accent/30 rounded-3xl p-6 sm:p-8 shadow-warm space-y-4">
            <div className="border-b border-brand-accent/20 pb-3">
              <h2 className="font-serif text-lg font-bold text-brand-primary">
                6. Candidate Photographs (2-3 तस्वीरें) *
              </h2>
              <p className="text-xs text-body-muted mt-0.5">
                Upload 1 to 3 recent, clear photographs (Portrait close-up, formal/traditional, and casual). Images are compressed automatically for fast browsing.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-center">
              {photos.map((src, index) => (
                <div
                  key={index}
                  className="relative aspect-3/4 rounded-2xl overflow-hidden border-2 border-brand-accent/40 bg-canvas-warm/40 shadow-xs group"
                >
                  <img src={src} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(index)}
                      className="px-2.5 py-1 bg-red-600 text-white rounded-full text-xs font-bold shadow-sm"
                    >
                      Delete
                    </button>
                  </div>
                  <span className="absolute bottom-1.5 left-1.5 bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                    Photo #{index + 1}
                  </span>
                </div>
              ))}

              {photos.length < 3 && (
                <label className="aspect-3/4 rounded-2xl border-2 border-dashed border-brand-accent/60 hover:border-brand-primary bg-canvas-warm/20 hover:bg-canvas-warm/40 transition flex flex-col items-center justify-center cursor-pointer p-4 text-center">
                  <span className="text-2xl mb-1">📷</span>
                  <span className="text-xs font-bold text-brand-primary">
                    {photoUploading ? "Compressing..." : "+ Upload Photo"}
                  </span>
                  <span className="text-[10px] text-body-muted mt-1">JPEG / PNG</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAddPhoto}
                    disabled={photoUploading}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* SECTION 7: PARTNER PREFERENCES & CONTACT */}
          <div className="bg-white border border-brand-accent/30 rounded-3xl p-6 sm:p-8 shadow-warm space-y-5">
            <div className="border-b border-brand-accent/20 pb-3">
              <h2 className="font-serif text-lg font-bold text-brand-primary">
                7. Partner Preferences &amp; Family Contact (अपेक्षाएं एवं संपर्क)
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-extrabold uppercase text-body-heading mb-1">
                  Partner Age Range
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={prefMinAge}
                    onChange={(e) => setPrefMinAge(e.target.value)}
                    placeholder="Min (e.g. 22)"
                    className="w-full px-2.5 py-1.5 rounded-xl border border-brand-accent/40 text-center"
                  />
                  <span className="text-body-muted font-bold">to</span>
                  <input
                    type="number"
                    value={prefMaxAge}
                    onChange={(e) => setPrefMaxAge(e.target.value)}
                    placeholder="Max (e.g. 30)"
                    className="w-full px-2.5 py-1.5 rounded-xl border border-brand-accent/40 text-center"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase text-body-heading mb-1">
                  Partner Height Range (cm)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={prefMinHeight}
                    onChange={(e) => setPrefMinHeight(e.target.value)}
                    placeholder="Min (155)"
                    className="w-full px-2.5 py-1.5 rounded-xl border border-brand-accent/40 text-center"
                  />
                  <span className="text-body-muted font-bold">to</span>
                  <input
                    type="number"
                    value={prefMaxHeight}
                    onChange={(e) => setPrefMaxHeight(e.target.value)}
                    placeholder="Max (185)"
                    className="w-full px-2.5 py-1.5 rounded-xl border border-brand-accent/40 text-center"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-extrabold uppercase text-body-heading mb-1">
                  Partner Expectations Note
                </label>
                <input
                  type="text"
                  value={prefNotes}
                  onChange={(e) => setPrefNotes(e.target.value)}
                  placeholder="e.g. Looking for well-educated, cultured professional from a respectable family"
                  className="w-full px-3 py-1.5 rounded-xl border border-brand-accent/40"
                />
              </div>
            </div>

            {/* Contact Person */}
            <div className="pt-3 border-t border-brand-accent/20 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-extrabold uppercase text-body-heading mb-1">
                  Contact Person Name *
                </label>
                <input
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  placeholder="e.g. Shri Ramesh Agarwal (Father)"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-brand-accent/40 font-semibold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase text-body-heading mb-1">
                  Relation to Candidate *
                </label>
                <input
                  type="text"
                  value={contactRelation}
                  onChange={(e) => setContactRelation(e.target.value)}
                  placeholder="Father / Mother / Self"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-brand-accent/40"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase text-body-heading mb-1">
                  Primary WhatsApp / Mobile *
                </label>
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+91 / +65..."
                  required
                  className="w-full px-3 py-2 rounded-xl border border-brand-accent/40 font-semibold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase text-body-heading mb-1">
                  Secondary Phone (Optional)
                </label>
                <input
                  type="tel"
                  value={secondaryPhone}
                  onChange={(e) => setSecondaryPhone(e.target.value)}
                  placeholder="Alternate number"
                  className="w-full px-3 py-2 rounded-xl border border-brand-accent/40"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-extrabold uppercase text-body-heading mb-1">
                  Contact Email Address
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full px-3 py-2 rounded-xl border border-brand-accent/40"
                />
              </div>

              <div className="sm:col-span-3 pt-2 border-t border-brand-accent/15">
                <label className="block text-[11px] font-extrabold uppercase text-body-heading mb-1">
                  Referenced By / Suggested By (Optional)
                </label>
                <input
                  type="text"
                  value={referencedBy}
                  onChange={(e) => setReferencedBy(e.target.value)}
                  placeholder="e.g. Shri Ramesh Agarwal"
                  className="w-full px-3 py-2 rounded-xl border border-brand-accent/40 bg-white text-xs"
                />
              </div>
            </div>
          </div>

          {/* SUBMIT BUTTON */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <Link
              href="/matrimony"
              className="text-xs font-bold text-body-muted hover:text-brand-primary hover:underline"
            >
              Cancel &amp; Return to Directory
            </Link>

            <button
              type="submit"
              disabled={isSubmitting || !selectedMember}
              className="w-full sm:w-auto px-8 py-3 rounded-full text-sm font-bold text-white va-btn-join shadow-goldCta transition-transform active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? "Publishing Candidate Profile..." : "✓ Publish Matrimonial Profile"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

export default function CreateMatrimonyProfilePage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-canvas-warm/30 py-16 flex flex-col items-center justify-center">
          <div className="w-10 h-10 rounded-full border-2 border-brand-accent border-t-brand-primary animate-spin mb-3" />
          <p className="text-xs font-bold text-brand-primary tracking-wide uppercase">
            Loading Candidate Registration...
          </p>
        </div>
      }
    >
      <CreateMatrimonyProfileForm />
    </React.Suspense>
  );
}
