'use client';

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBusinessProfile } from "@/actions/business";
import { getCurrentHouseholdDashboard } from "@/actions/dashboard";
import { optimizeImageForUpload } from "@/lib/image-optimizer";
import type { LinkedDirector, BusinessCustomField } from "@/types/business";
import type { Member } from "@/types/household";

const SECTOR_OPTIONS = [
  "Manufacturing & Heavy Industries",
  "Textiles, Apparel & Garments",
  "Steel, Iron & Metals",
  "Chemicals & Plastics",
  "Information Technology & Software",
  "Finance & Investment",
  "Real Estate & Construction",
  "Retail & FMCG",
  "Healthcare & Pharmaceuticals",
  "Logistics & Supply Chain",
  "Agro & Food Processing",
  "Jewellery & Precious Metals",
  "Professional & Legal Services",
  "Education & EdTech",
  "Hospitality & Events",
  "Other",
];

const BUSINESS_TYPE_OPTIONS = [
  "Manufacturer",
  "Wholesaler / Trader / Distributor",
  "Retailer",
  "Exporter / Importer",
  "Professional Firm / Consultancy",
  "Service Provider",
  "Other",
];

const REGISTRATION_TYPE_OPTIONS = [
  "GSTIN (Goods and Services Tax)",
  "CIN (Corporate Identity Number)",
  "MSME / Udyam Registration",
  "LLP Registration",
  "Partnership Deed",
  "Sole Proprietorship",
  "Other / Unregistered",
];

export default function CreateBusinessPage() {
  const router = useRouter();

  // Wizard Step State (1 to 4)
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState("");
  const [submissionError, setSubmissionError] = useState("");
  const [createdBusinessId, setCreatedBusinessId] = useState<string | null>(null);

  // Available household members to link
  const [householdMembers, setHouseholdMembers] = useState<Member[]>([]);

  // Step 1: Company Profile & Location
  const [businessName, setBusinessName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [tagline, setTagline] = useState("");
  const [industrySector, setIndustrySector] = useState(SECTOR_OPTIONS[0]);
  const [businessType, setBusinessType] = useState(BUSINESS_TYPE_OPTIONS[0]);
  const [yearEstablished, setYearEstablished] = useState<string>("");
  const [country, setCountry] = useState("India");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");
  const [addressLine, setAddressLine] = useState("");

  // Step 2: About & Commercial Offerings
  const [aboutBusiness, setAboutBusiness] = useState("");
  const [offeringsSummary, setOfferingsSummary] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [twitterUrl, setTwitterUrl] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [customFields, setCustomFields] = useState<BusinessCustomField[]>([]);

  // Step 3: Media & Credentials
  const [photos, setPhotos] = useState<string[]>([]);
  const [registrationType, setRegistrationType] = useState(REGISTRATION_TYPE_OPTIONS[0]);
  const [registrationNumber, setRegistrationNumber] = useState("");

  // Step 4: Leadership Linking
  const [linkedDirectors, setLinkedDirectors] = useState<LinkedDirector[]>([]);

  // Initial Load & Auth Check
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const res = await getCurrentHouseholdDashboard();
        if (!res.success || !res.household) {
          setAuthError("Please sign in with your verified family account to register an enterprise.");
          setIsLoading(false);
          return;
        }

        if (res.household.status !== "live") {
          setAuthError(
            "Your household profile is currently under review. Businesses can only be registered once your family is approved."
          );
          setIsLoading(false);
          return;
        }

        setHouseholdMembers(res.household.members || []);

        // Pre-populate primary member as initial director if available
        if (res.household.members && res.household.members.length > 0) {
          const head = res.household.members.find((m) => m.relationToHead === "self") || res.household.members[0];
          setLinkedDirectors([
            {
              memberId: head.id,
              serialNo: head.serialNo,
              name: head.fullName,
              roleTitle: "Founder & Director",
              isPrimaryContact: true,
            },
          ]);
        }
      } catch (err) {
        console.error("Failed to load household dashboard:", err);
        setAuthError("Could not verify household membership.");
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // Step 2 Custom Fields Helpers
  const handleAddCustomField = () => {
    setCustomFields([
      ...customFields,
      { id: Date.now().toString(), label: "", value: "" },
    ]);
  };

  const handleUpdateCustomField = (id: string, field: "label" | "value", text: string) => {
    setCustomFields(
      customFields.map((f) => (f.id === id ? { ...f, [field]: text } : f))
    );
  };

  const handleRemoveCustomField = (id: string) => {
    setCustomFields(customFields.filter((f) => f.id !== id));
  };

  // Step 3 Photo Upload Handler
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (photos.length + files.length > 3) {
      alert("You can upload a maximum of 3 corporate photos.");
      return;
    }

    try {
      const newPhotos: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 5 * 1024 * 1024) {
          alert(`File ${file.name} exceeds 5MB limit.`);
          continue;
        }
        const optimized = await optimizeImageForUpload(file, 800, 0.85);
        newPhotos.push(optimized);
      }
      setPhotos([...photos, ...newPhotos].slice(0, 3));
    } catch (err: any) {
      alert(err.message || "Error processing image.");
    }
  };

  const handleRemovePhoto = (idx: number) => {
    setPhotos(photos.filter((_, i) => i !== idx));
  };

  // Step 4 Leadership Helpers
  const handleAddDirectorFromHousehold = (member: Member) => {
    if (linkedDirectors.some((d) => d.memberId === member.id)) {
      alert("This family member is already added to leadership.");
      return;
    }
    setLinkedDirectors([
      ...linkedDirectors,
      {
        memberId: member.id,
        serialNo: member.serialNo,
        name: member.fullName,
        roleTitle: "Director",
        isPrimaryContact: linkedDirectors.length === 0,
      },
    ]);
  };

  const handleUpdateDirectorRole = (index: number, roleTitle: string) => {
    const updated = [...linkedDirectors];
    updated[index].roleTitle = roleTitle;
    setLinkedDirectors(updated);
  };

  const handleSetPrimaryContact = (index: number) => {
    const updated = linkedDirectors.map((d, i) => ({
      ...d,
      isPrimaryContact: i === index,
    }));
    setLinkedDirectors(updated);
  };

  const handleRemoveDirector = (index: number) => {
    const wasPrimary = linkedDirectors[index].isPrimaryContact;
    const remaining = linkedDirectors.filter((_, i) => i !== index);
    if (wasPrimary && remaining.length > 0) {
      remaining[0].isPrimaryContact = true;
    }
    setLinkedDirectors(remaining);
  };

  // Step Validation & Navigation
  const validateStep = (step: number): boolean => {
    if (step === 1) {
      if (!businessName.trim()) {
        alert("Please enter the Business / Trade Name.");
        return false;
      }
      if (!state.trim() || !city.trim()) {
        alert("Please provide both State and City.");
        return false;
      }
      return true;
    }

    if (step === 2) {
      if (!aboutBusiness.trim() || aboutBusiness.trim().length < 30) {
        alert("Please provide an About Business description of at least 30 characters.");
        return false;
      }
      return true;
    }

    if (step === 3) {
      return true;
    }

    if (step === 4) {
      if (linkedDirectors.length === 0) {
        alert("Please link at least one Founder / Director to this enterprise.");
        return false;
      }
      if (!linkedDirectors.some((d) => d.isPrimaryContact)) {
        alert("Please select one Director as the Primary Contact for business inquiries.");
        return false;
      }
      return true;
    }

    return true;
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 4));
    }
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  // Final Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(4)) return;

    setIsSubmitting(true);
    setSubmissionError("");

    try {
      const res = await createBusinessProfile({
        businessName: businessName.trim(),
        legalName: legalName.trim() || undefined,
        tagline: tagline.trim() || undefined,
        industrySector,
        businessType,
        yearEstablished: yearEstablished ? parseInt(yearEstablished, 10) : undefined,
        aboutBusiness: aboutBusiness.trim(),
        offeringsSummary: offeringsSummary.trim() || undefined,
        registrationType: registrationType || undefined,
        registrationNumber: registrationNumber.trim() || undefined,
        country,
        state: state.trim(),
        city: city.trim(),
        pincode: pincode.trim() || undefined,
        addressLine: addressLine.trim() || undefined,
        websiteUrl: websiteUrl.trim() || undefined,
        socialLinks: {
          linkedin: linkedinUrl.trim() || undefined,
          twitter: twitterUrl.trim() || undefined,
          facebook: facebookUrl.trim() || undefined,
          instagram: instagramUrl.trim() || undefined,
        },
        photos,
        customFields: customFields.filter((f) => f.label.trim() && f.value.trim()),
        linkedDirectors,
      });

      if (res.success && res.profile) {
        setCreatedBusinessId(res.profile.id);
      } else {
        setSubmissionError(res.error || "Failed to create business profile.");
      }
    } catch (err: any) {
      console.error("Submission failed:", err);
      setSubmissionError(err.message || "An unexpected error occurred during submission.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-[70vh] bg-canvas-page py-12 px-4 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-brand-accent/30 border-t-brand-primary rounded-full animate-spin mx-auto"></div>
          <p className="text-xs sm:text-sm text-body-muted">Verifying household eligibility...</p>
        </div>
      </main>
    );
  }

  if (authError) {
    return (
      <main className="min-h-[70vh] bg-canvas-page py-12 px-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-white border border-brand-accent/30 rounded-3xl p-8 text-center space-y-5 shadow-warm">
          <div className="w-16 h-16 rounded-full bg-amber-50 border border-brand-accent/40 text-brand-primary flex items-center justify-center text-3xl mx-auto">
            🏢
          </div>
          <div className="space-y-2">
            <h2 className="font-serif text-xl font-bold text-brand-primary">Household Registration Required</h2>
            <p className="text-xs sm:text-sm text-body-muted">{authError}</p>
          </div>
          <div className="flex flex-col gap-2.5 pt-2">
            <Link
              href="/login?redirect=/businesses/create"
              className="w-full py-2.5 rounded-full text-xs font-bold text-white va-btn-join shadow-goldCta"
            >
              Sign In to Your Account →
            </Link>
            <Link
              href="/businesses"
              className="w-full py-2.5 rounded-full text-xs font-semibold text-brand-primary bg-amber-50 hover:bg-amber-100 border border-brand-accent/30 transition"
            >
              Browse Business Directory
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Success State Confirmation
  if (createdBusinessId) {
    return (
      <main className="min-h-[70vh] bg-canvas-page py-12 px-4 flex items-center justify-center">
        <div className="max-w-lg w-full bg-white border-2 border-emerald-300 rounded-3xl p-8 text-center space-y-6 shadow-warm">
          <div className="w-20 h-20 rounded-full bg-emerald-50 border-2 border-emerald-300 text-emerald-600 flex items-center justify-center text-4xl mx-auto">
            ✓
          </div>
          <div className="space-y-2">
            <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Submitted for Verification
            </span>
            <h2 className="font-serif text-2xl font-black text-brand-primary mt-2">
              Enterprise Profile Registered!
            </h2>
            <p className="text-xs sm:text-sm text-body-muted leading-relaxed">
              <strong>{businessName}</strong> has been submitted to the community moderation queue. Our team will verify
              your registration details and award the green Verified Enterprise badge.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-canvas-warm/50 border border-brand-accent/20 text-xs text-left text-body-heading space-y-1">
            <p>• Track approval status directly in your Member Dashboard.</p>
            <p>• Commercial inquiries will route via secure in-website chat to your Primary Contact director.</p>
            <p>• Contact phone and personal emails remain safely shielded from public scrapers.</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href={`/businesses/${createdBusinessId}`}
              className="w-full sm:w-auto px-6 py-2.5 rounded-full text-xs font-bold text-white va-btn-join shadow-goldCta"
            >
              Preview Enterprise Profile →
            </Link>
            <Link
              href="/dashboard"
              className="w-full sm:w-auto px-6 py-2.5 rounded-full text-xs font-semibold text-brand-primary bg-amber-50 hover:bg-amber-100 border border-brand-accent/30 transition"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-canvas-page py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/businesses"
            className="text-xs sm:text-sm font-semibold text-brand-primary hover:text-brand-burgundy transition flex items-center gap-1.5"
          >
            <span>←</span> Back to Directory
          </Link>
          <span className="text-xs text-body-muted">4-Step Enterprise Registration</span>
        </div>

        {/* Wizard Progress Indicator */}
        <div className="bg-white rounded-3xl border border-brand-accent/30 p-6 shadow-xs">
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            {[
              { num: 1, title: "1. Info" },
              { num: 2, title: "2. Offerings" },
              { num: 3, title: "3. Media" },
              { num: 4, title: "4. Leadership" },
            ].map((step) => {
              const isActive = currentStep === step.num;
              const isDone = currentStep > step.num;

              return (
                <div key={step.num} className="space-y-1.5">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      isActive
                        ? "bg-brand-primary shadow-xs"
                        : isDone
                        ? "bg-emerald-500"
                        : "bg-canvas-warm/80"
                    }`}
                  />
                  <span
                    className={`font-semibold hidden sm:inline ${
                      isActive ? "text-brand-primary" : isDone ? "text-emerald-700" : "text-body-muted"
                    }`}
                  >
                    {step.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-white rounded-3xl border border-brand-accent/30 p-6 sm:p-10 shadow-warm">
          {submissionError && (
            <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-800">
              {submissionError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* STEP 1: Company Profile & Location */}
            {currentStep === 1 && (
              <div className="space-y-5">
                <div>
                  <h2 className="font-serif text-xl font-bold text-brand-primary">
                    Step 1: Enterprise Profile & Location
                  </h2>
                  <p className="text-xs text-body-muted mt-1">
                    Enter the public brand details and geographical presence of your business.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-body-heading mb-1">
                      Business / Trade Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="e.g. Agarwal Steel & Alloys Corp"
                      className="w-full px-4 py-2.5 rounded-xl border border-brand-accent/30 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-body-heading mb-1">
                        Legal Entity Name (Optional)
                      </label>
                      <input
                        type="text"
                        value={legalName}
                        onChange={(e) => setLegalName(e.target.value)}
                        placeholder="e.g. Agarwal Steels Pvt. Ltd."
                        className="w-full px-4 py-2.5 rounded-xl border border-brand-accent/30 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-body-heading mb-1">
                        Tagline / Catchphrase (Optional)
                      </label>
                      <input
                        type="text"
                        value={tagline}
                        onChange={(e) => setTagline(e.target.value)}
                        placeholder="e.g. Precision Engineering Since 1992"
                        className="w-full px-4 py-2.5 rounded-xl border border-brand-accent/30 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-body-heading mb-1">
                        Industry Sector *
                      </label>
                      <select
                        value={industrySector}
                        onChange={(e) => setIndustrySector(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-brand-accent/30 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-accent"
                      >
                        {SECTOR_OPTIONS.map((sec) => (
                          <option key={sec} value={sec}>
                            {sec}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-body-heading mb-1">
                        Business Type *
                      </label>
                      <select
                        value={businessType}
                        onChange={(e) => setBusinessType(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-brand-accent/30 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-accent"
                      >
                        {BUSINESS_TYPE_OPTIONS.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-body-heading mb-1">
                        Year Established
                      </label>
                      <input
                        type="number"
                        min="1800"
                        max={new Date().getFullYear()}
                        value={yearEstablished}
                        onChange={(e) => setYearEstablished(e.target.value)}
                        placeholder="e.g. 1995"
                        className="w-full px-4 py-2.5 rounded-xl border border-brand-accent/30 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                      />
                    </div>
                  </div>

                  {/* Location Fields */}
                  <div className="pt-2 border-t border-brand-accent/20 space-y-4">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-body-muted">
                      Location & Address
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-body-heading mb-1">
                          Country *
                        </label>
                        <input
                          type="text"
                          required
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-brand-accent/30 text-sm bg-gray-50 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-body-heading mb-1">
                          State *
                        </label>
                        <input
                          type="text"
                          required
                          value={state}
                          onChange={(e) => setState(e.target.value)}
                          placeholder="e.g. Maharashtra"
                          className="w-full px-4 py-2.5 rounded-xl border border-brand-accent/30 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-body-heading mb-1">
                          City *
                        </label>
                        <input
                          type="text"
                          required
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="e.g. Mumbai"
                          className="w-full px-4 py-2.5 rounded-xl border border-brand-accent/30 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-body-heading mb-1">
                          Address Line (Optional)
                        </label>
                        <input
                          type="text"
                          value={addressLine}
                          onChange={(e) => setAddressLine(e.target.value)}
                          placeholder="e.g. Plot 42, MIDC Industrial Area"
                          className="w-full px-4 py-2.5 rounded-xl border border-brand-accent/30 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-body-heading mb-1">
                          Pincode (Optional)
                        </label>
                        <input
                          type="text"
                          value={pincode}
                          onChange={(e) => setPincode(e.target.value)}
                          placeholder="e.g. 400093"
                          className="w-full px-4 py-2.5 rounded-xl border border-brand-accent/30 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: About & Commercial Offerings */}
            {currentStep === 2 && (
              <div className="space-y-5">
                <div>
                  <h2 className="font-serif text-xl font-bold text-brand-primary">
                    Step 2: About & Commercial Offerings
                  </h2>
                  <p className="text-xs text-body-muted mt-1">
                    Describe your business scale, key products, services, and online presence.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-body-heading mb-1">
                      About the Business * (Min 30 characters)
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={aboutBusiness}
                      onChange={(e) => setAboutBusiness(e.target.value)}
                      placeholder="Share your company history, operational scale, manufacturing capabilities, or mission..."
                      className="w-full px-4 py-2.5 rounded-xl border border-brand-accent/30 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-body-heading mb-1">
                      Products, Services & Offerings Summary
                    </label>
                    <textarea
                      rows={3}
                      value={offeringsSummary}
                      onChange={(e) => setOfferingsSummary(e.target.value)}
                      placeholder="List key product lines, wholesale catalogs, or consulting specializations..."
                      className="w-full px-4 py-2.5 rounded-xl border border-brand-accent/30 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                    />
                  </div>

                  {/* Online & Social Links */}
                  <div className="pt-2 border-t border-brand-accent/20 space-y-4">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-body-muted">
                      Online Presence & Links
                    </h3>

                    <div>
                      <label className="block text-xs font-bold text-body-heading mb-1">
                        Official Website URL
                      </label>
                      <input
                        type="url"
                        value={websiteUrl}
                        onChange={(e) => setWebsiteUrl(e.target.value)}
                        placeholder="https://www.example.com"
                        className="w-full px-4 py-2.5 rounded-xl border border-brand-accent/30 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-body-heading mb-1">
                          LinkedIn Profile URL
                        </label>
                        <input
                          type="url"
                          value={linkedinUrl}
                          onChange={(e) => setLinkedinUrl(e.target.value)}
                          placeholder="https://linkedin.com/company/..."
                          className="w-full px-4 py-2.5 rounded-xl border border-brand-accent/30 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-body-heading mb-1">
                          Twitter / X URL
                        </label>
                        <input
                          type="url"
                          value={twitterUrl}
                          onChange={(e) => setTwitterUrl(e.target.value)}
                          placeholder="https://x.com/..."
                          className="w-full px-4 py-2.5 rounded-xl border border-brand-accent/30 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Custom Specifications */}
                  <div className="pt-2 border-t border-brand-accent/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-extrabold uppercase tracking-wider text-body-muted">
                          Custom Specifications & Metrics
                        </h3>
                        <p className="text-[11px] text-body-muted">
                          Add custom attributes like Export Markets, Factory Area, Production Capacity, etc.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddCustomField}
                        className="px-3 py-1 rounded-full text-xs font-bold text-brand-primary bg-amber-50 hover:bg-amber-100 border border-brand-accent/30 transition"
                      >
                        + Add Attribute
                      </button>
                    </div>

                    {customFields.map((field) => (
                      <div key={field.id} className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Attribute Label (e.g. Export Markets)"
                          value={field.label}
                          onChange={(e) => handleUpdateCustomField(field.id, "label", e.target.value)}
                          className="w-1/2 px-3 py-2 rounded-xl border border-brand-accent/30 text-xs focus:outline-none focus:ring-2 focus:ring-brand-accent"
                        />
                        <input
                          type="text"
                          placeholder="Value (e.g. UAE, USA, Germany)"
                          value={field.value}
                          onChange={(e) => handleUpdateCustomField(field.id, "value", e.target.value)}
                          className="w-1/2 px-3 py-2 rounded-xl border border-brand-accent/30 text-xs focus:outline-none focus:ring-2 focus:ring-brand-accent"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomField(field.id)}
                          className="text-xs text-red-600 hover:text-red-800 px-2 py-1"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: Media & Credentials */}
            {currentStep === 3 && (
              <div className="space-y-5">
                <div>
                  <h2 className="font-serif text-xl font-bold text-brand-primary">
                    Step 3: Media & Credentials
                  </h2>
                  <p className="text-xs text-body-muted mt-1">
                    Upload corporate photos and supply registration details for the green Verified Enterprise badge.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Photo Uploads */}
                  <div>
                    <label className="block text-xs font-bold text-body-heading mb-1">
                      Corporate Photos (1 to 3 photos: Logo, Factory, Products, or Office)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoUpload}
                      disabled={photos.length >= 3}
                      className="block w-full text-xs text-body-muted file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-amber-50 file:text-brand-primary hover:file:bg-amber-100 cursor-pointer"
                    />
                    <p className="text-[11px] text-body-muted mt-1">
                      Images are automatically compressed to ensure fast loading on mobile networks. Max 3 photos.
                    </p>

                    {photos.length > 0 && (
                      <div className="flex items-center gap-3 mt-3">
                        {photos.map((photo, idx) => (
                          <div
                            key={idx}
                            className="relative w-24 h-20 rounded-xl overflow-hidden border border-brand-accent/30 shadow-xs"
                          >
                            <img src={photo} alt="" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => handleRemovePhoto(idx)}
                              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center text-[10px]"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Credentials / Verification */}
                  <div className="pt-4 border-t border-brand-accent/20 space-y-4">
                    <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                        <span>🛡️</span> Verified Enterprise Badge Review
                      </div>
                      <p className="text-[11px] text-emerald-900 leading-normal">
                        Providing your business registration credential (GSTIN, CIN, or MSME) enables our admin moderation
                        panel to inspect government records and grant the green Verified Enterprise badge.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-body-heading mb-1">
                          Registration Credential Type
                        </label>
                        <select
                          value={registrationType}
                          onChange={(e) => setRegistrationType(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl border border-brand-accent/30 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-accent"
                        >
                          {REGISTRATION_TYPE_OPTIONS.map((reg) => (
                            <option key={reg} value={reg}>
                              {reg}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-body-heading mb-1">
                          Registration Number / ID
                        </label>
                        <input
                          type="text"
                          value={registrationNumber}
                          onChange={(e) => setRegistrationNumber(e.target.value)}
                          placeholder="e.g. 27AAAAA0000A1Z5 or U12345MH2020PTC123456"
                          className="w-full px-4 py-2.5 rounded-xl border border-brand-accent/30 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent uppercase"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: Leadership Linking */}
            {currentStep === 4 && (
              <div className="space-y-5">
                <div>
                  <h2 className="font-serif text-xl font-bold text-brand-primary">
                    Step 4: Leadership & Governance Linking
                  </h2>
                  <p className="text-xs text-body-muted mt-1">
                    Link verified Agarwal family members as Directors/Promoters and designate the Primary Chat Contact.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Household Member Quick-Add */}
                  {householdMembers.length > 0 && (
                    <div className="p-4 rounded-2xl bg-canvas-warm/50 border border-brand-accent/20 space-y-2">
                      <span className="text-xs font-bold text-body-heading">
                        Add from Your Household Members:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {householdMembers.map((m) => {
                          const isAlreadyLinked = linkedDirectors.some((d) => d.memberId === m.id);
                          return (
                            <button
                              key={m.id}
                              type="button"
                              disabled={isAlreadyLinked}
                              onClick={() => handleAddDirectorFromHousehold(m)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                                isAlreadyLinked
                                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                  : "bg-white hover:bg-amber-50 text-brand-primary border border-brand-accent/40 shadow-xs"
                              }`}
                            >
                              + {m.fullName} ({m.relationToHead})
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Active Directors List */}
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-body-heading">
                      Linked Directors & Key Management ({linkedDirectors.length})
                    </label>

                    {linkedDirectors.length === 0 ? (
                      <p className="text-xs text-red-600 italic">
                        Please add at least one Director or Founder to represent this enterprise.
                      </p>
                    ) : (
                      <div className="space-y-2.5">
                        {linkedDirectors.map((director, idx) => (
                          <div
                            key={idx}
                            className="p-4 rounded-2xl border border-brand-accent/30 bg-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs"
                          >
                            <div className="space-y-1">
                              <p className="text-xs sm:text-sm font-bold text-brand-primary">
                                {director.name}
                              </p>
                              {director.serialNo && (
                                <p className="text-[11px] text-body-muted">
                                  Member ID: <span className="font-mono">{director.serialNo}</span>
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-3 w-full sm:w-auto">
                              <input
                                type="text"
                                value={director.roleTitle}
                                onChange={(e) => handleUpdateDirectorRole(idx, e.target.value)}
                                placeholder="Role Title (e.g. Managing Director)"
                                className="px-3 py-1.5 rounded-xl border border-brand-accent/30 text-xs focus:outline-none focus:ring-2 focus:ring-brand-accent flex-1 sm:flex-none"
                              />

                              <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs font-semibold">
                                <input
                                  type="radio"
                                  name="primaryContact"
                                  checked={director.isPrimaryContact}
                                  onChange={() => handleSetPrimaryContact(idx)}
                                  className="text-brand-primary"
                                />
                                <span className={director.isPrimaryContact ? "text-brand-primary" : "text-body-muted"}>
                                  Primary Contact
                                </span>
                              </label>

                              {linkedDirectors.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveDirector(idx)}
                                  className="text-xs text-red-600 hover:text-red-800 px-1"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Wizard Navigation Bar */}
            <div className="pt-6 border-t border-brand-accent/20 flex items-center justify-between">
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="px-5 py-2.5 rounded-full text-xs font-semibold text-brand-primary bg-amber-50 hover:bg-amber-100 border border-brand-accent/30 transition"
                >
                  ← Previous Step
                </button>
              ) : (
                <div></div>
              )}

              {currentStep < 4 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="px-6 py-2.5 rounded-full text-xs font-bold text-white va-btn-join shadow-goldCta"
                >
                  Continue to Step {currentStep + 1} →
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-8 py-3 rounded-full text-xs sm:text-sm font-bold text-white va-btn-join shadow-goldCta"
                >
                  {isSubmitting ? "Submitting Enterprise..." : "Submit for Moderation Approval →"}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
