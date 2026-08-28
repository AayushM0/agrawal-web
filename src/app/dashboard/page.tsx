'use client';

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getCurrentHouseholdDashboard } from "@/actions/dashboard";
import { createClaimInvite } from "@/actions/claim";
import { clearSession } from "@/actions/auth";
import { saveMemberProfile, saveHouseholdInfo } from "@/actions/profile";
import { gotras } from "@/data/gotras";
import { Household, Member } from "@/types/household";
import LocationSelector from "@/components/LocationSelector";
import { calculateAge, maskContact } from "@/lib/privacy";

export default function DashboardPage() {
  const router = useRouter();
  const [household, setHousehold] = useState<Household | null>(null);
  const [sessionContact, setSessionContact] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Edit Member Modal State
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [isSavingMember, setIsSavingMember] = useState(false);
  const [memberSaveError, setMemberSaveError] = useState("");
  const [memberSaveSuccess, setMemberSaveSuccess] = useState("");

  // Edit Household Modal State
  const [isEditingHousehold, setIsEditingHousehold] = useState(false);
  const [householdGotra, setHouseholdGotra] = useState("");
  const [householdNativePlace, setHouseholdNativePlace] = useState("");
  const [isSavingHousehold, setIsSavingHousehold] = useState(false);
  const [householdSaveError, setHouseholdSaveError] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    const res = await getCurrentHouseholdDashboard();
    if (res.success && res.household) {
      setHousehold(res.household);
      setSessionContact(res.sessionContact);
      setHouseholdGotra(res.household.gotra || gotras[0].name);
      setHouseholdNativePlace(res.household.nativePlace || "");
    } else {
      setHousehold(null);
      setSessionContact(res.sessionContact);
    }
    setIsLoading(false);
  }

  const handleCopyClaimLink = async (memberId: string) => {
    const res = await createClaimInvite(memberId);
    if (res.success && res.token) {
      const fullUrl = `${window.location.origin}/claim?token=${encodeURIComponent(res.token)}`;
      try {
        await navigator.clipboard.writeText(fullUrl);
      } catch {
        const textarea = document.createElement("textarea");
        textarea.value = fullUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopiedToken(memberId);
      setTimeout(() => setCopiedToken(null), 2500);
    }
  };

  const handleLogout = async () => {
    await clearSession();
    router.push("/login");
    router.refresh();
  };

  const openEditMemberModal = (member: Member) => {
    setEditingMember({ ...member });
    setMemberSaveError("");
    setMemberSaveSuccess("");
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingMember) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("Please select an image smaller than 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      const dataUrl = loadEvt.target?.result as string;
      setEditingMember({ ...editingMember, photoUrl: dataUrl });
    };
    reader.readAsDataURL(file);
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    if (!editingMember.fullName?.trim() || editingMember.fullName.trim().length < 2) {
      setMemberSaveError("Full Name must be at least 2 characters.");
      return;
    }

    if (!editingMember.fatherName || editingMember.fatherName.trim().length < 2) {
      const isSpouseOrMarriedFemale = editingMember.maritalStatus === "Married" && (editingMember.gender === "Female" || editingMember.relationToHead === "spouse");
      const label = isSpouseOrMarriedFemale ? "Father's / Husband's Name (पिता / पति का नाम)" : "Father's Name (पिता का नाम)";
      setMemberSaveError(`${label} is required.`);
      return;
    }

    setIsSavingMember(true);
    setMemberSaveError("");
    setMemberSaveSuccess("");

    const res = await saveMemberProfile({
      memberId: editingMember.id,
      fullName: editingMember.fullName,
      fatherName: editingMember.fatherName,
      photoUrl: editingMember.photoUrl,
      dob: editingMember.dob,
      gender: editingMember.gender,
      maritalStatus: editingMember.maritalStatus,
      companyName: editingMember.companyName,
      anniversaryDate: editingMember.anniversaryDate,
      currentCity: editingMember.currentCity,
      currentCountry: editingMember.currentCountry,
      profession: editingMember.professionTitle || editingMember.profession,
      professionTitle: editingMember.professionTitle,
      professionDescription: editingMember.professionDescription,
      bio: editingMember.bio,
      visibility: editingMember.visibility,
    });

    setIsSavingMember(false);
    if (res.success) {
      setMemberSaveSuccess("Profile updated successfully!");
      setTimeout(() => {
        setEditingMember(null);
        loadData();
      }, 1000);
    } else {
      setMemberSaveError(res.error || "Failed to update profile details.");
    }
  };

  const handleSaveHousehold = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!household) return;
    setIsSavingHousehold(true);
    setHouseholdSaveError("");

    const res = await saveHouseholdInfo(household.id, {
      gotra: householdGotra,
      nativePlace: householdNativePlace,
    });

    setIsSavingHousehold(false);
    if (res.success) {
      setIsEditingHousehold(false);
      loadData();
    } else {
      setHouseholdSaveError(res.error || "Failed to update family origin.");
    }
  };

  if (isLoading) {
    return (
      <main className="py-16 bg-canvas-page min-h-[60vh] flex items-center justify-center">
        <div className="text-center px-4">
          <div className="w-10 h-10 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs font-bold text-body-muted">Loading your live household records from database...</p>
        </div>
      </main>
    );
  }

  if (!household) {
    return (
      <main className="py-12 sm:py-16 bg-canvas-page min-h-[60vh] flex items-center">
        <div className="max-w-md mx-auto px-4 w-full text-center">
          <div className="bg-white border-2 border-brand-accent/30 rounded-3xl p-6 sm:p-8 shadow-warm">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-brand-primary flex items-center justify-center text-xl font-bold mx-auto mb-3">
              🏡
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-brand-primary mb-2">
              No Registered Household Found
            </h1>
            <p className="text-xs text-body-muted mb-6 leading-relaxed">
              You are signed in as <strong>{sessionContact || "Guest"}</strong>, but no family registration is associated with this contact yet.
            </p>
            <div className="flex flex-col gap-2.5">
              <Link 
                href="/signup" 
                className="w-full py-3 rounded-full text-xs font-bold text-white va-btn-join shadow-goldCta flex items-center justify-center gap-1.5"
              >
                <span>Register Your Family Free</span>
                <span>→</span>
              </Link>
              <button 
                type="button"
                onClick={handleLogout} 
                className="w-full py-2.5 rounded-full text-xs font-semibold text-body-muted hover:text-brand-primary bg-canvas-warm/70 border border-brand-accent/20 hover:bg-canvas-warm transition-colors"
              >
                Sign Out & Try Another Number
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const isLive = household.status === "live";
  const isPending = household.status === "pending_review";
  const isRejected = household.status === "rejected";

  return (
    <main className="py-8 sm:py-12 bg-canvas-page min-h-[85vh]">
      <div className="max-w-5xl mx-auto px-4">
        {/* Top Household Banner */}
        <div className="bg-white border-2 border-brand-accent/30 rounded-3xl p-5 sm:p-8 shadow-warm mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-brand-accent/20">
            <div>
              <span className="text-xs font-bold uppercase va-badge-gold px-3 py-1 rounded-full mb-1.5 inline-block">
                Family Dashboard • परिवार डैशबोर्ड
              </span>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-xl sm:text-2xl font-black text-brand-primary">
                  {household.headName ? `${household.headName}'s Family` : "Your Family Household"}
                </h1>
                <button
                  type="button"
                  onClick={() => setIsEditingHousehold(true)}
                  className="px-3 py-1 rounded-full text-[11px] font-bold text-brand-primary bg-canvas-warm border border-brand-accent hover:bg-white transition-all shadow-xs"
                >
                  ✏️ Edit Family Origin
                </button>
              </div>
              <p className="text-xs text-body-muted mt-1">
                Gotra: <strong>{household.gotra || "Not specified"}</strong> • Native Place: <strong>{household.nativePlace || "Not specified"}</strong>
                {household.verifiedContact && (
                  <span className="block sm:inline sm:ml-1">• Registered Contact: <strong>{maskContact(household.verifiedContact)}</strong></span>
                )}
              </p>
            </div>

            <div className="flex flex-wrap sm:flex-col items-start sm:items-end gap-2">
              <span className="text-xs font-mono font-bold bg-canvas-warm border border-brand-accent px-3 py-1 rounded-full text-brand-primary">
                #{household.serialNo || household.householdCode}
              </span>
              {isLive && (
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-300">
                  ✓ Status: LIVE (Verified)
                </span>
              )}
              {isPending && (
                <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-300">
                  ⏳ Status: Pending Review
                </span>
              )}
              {isRejected && (
                <span className="text-[11px] font-bold text-red-700 bg-red-50 px-2.5 py-0.5 rounded-full border border-red-300">
                  ✕ Status: Revision Needed
                </span>
              )}
              <a
                href="/dashboard/pass"
                className="text-[11px] font-semibold text-amber-700 hover:text-amber-600 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-0.5 rounded-full transition-colors"
              >
                🪪 My Pass
              </a>
              <button
                type="button"
                onClick={handleLogout}
                className="text-[11px] text-body-muted hover:text-brand-primary hover:underline"
              >
                Sign Out
              </button>
            </div>
          </div>

          {isPending && (
            <div className="mt-4 p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 leading-relaxed">
              <strong>Application Under Verification:</strong> Your registration has been submitted into the community moderation queue. Once approved by a moderator, your family will become searchable across the global directory.
            </div>
          )}

          {isRejected && household.rejectionReason && (
            <div className="mt-4 p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-800 leading-relaxed">
              <strong>Moderator Feedback:</strong> {household.rejectionReason}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4 pt-5 text-xs text-center">
            <div className="p-3 rounded-xl bg-canvas-warm/40 border border-brand-accent/20">
              <span className="text-body-muted block text-[11px]">Total Members</span>
              <strong className="text-base text-brand-primary">{household.members?.length || 0}</strong>
            </div>
            <div className="p-3 rounded-xl bg-canvas-warm/40 border border-brand-accent/20">
              <span className="text-body-muted block text-[11px]">Self-Claimed</span>
              <strong className="text-base text-brand-primary">
                {household.members?.filter((m) => m.verifiedBySelf).length || 0}
              </strong>
            </div>
            <div className="p-3 rounded-xl bg-canvas-warm/40 border border-brand-accent/20">
              <span className="text-body-muted block text-[11px]">Head Managed</span>
              <strong className="text-base text-brand-primary">
                {household.members?.filter((m) => !m.verifiedBySelf).length || 0}
              </strong>
            </div>
            <div className="p-3 rounded-xl bg-canvas-warm/40 border border-brand-accent/20">
              <span className="text-body-muted block text-[11px]">Directory Visibility</span>
              <strong className={`text-base ${isLive ? "text-emerald-700" : "text-amber-700"}`}>
                {isLive ? "Active (Live)" : "Gated (Review)"}
              </strong>
            </div>
          </div>
        </div>

        {/* Member Management List */}
        <div className="bg-white border border-brand-accent/30 rounded-3xl p-5 sm:p-8 shadow-warm">
          <div className="flex items-center justify-between mb-5 pb-4 border-b border-brand-accent/20">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-brand-primary">
                Family Members &amp; Profile Management
              </h2>
              <p className="text-xs text-body-muted">
                You can edit personal details, profession, bio, and privacy settings anytime. Phone &amp; Email are permanently masked.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {(!household.members || household.members.length === 0) ? (
              <p className="text-xs text-body-muted italic text-center py-6">No family members registered yet.</p>
            ) : (
              household.members.map((m) => {
                const isClaimedBySelf = !!m.ownerLocked;
                const isCurrentLoggedInMember = (sessionContact && (m.phone === sessionContact || m.email === sessionContact)) || (m.relationToHead === "self");
                const canEditThisMember = isCurrentLoggedInMember || !m.ownerLocked;
                const age = calculateAge(m.dob);

                return (
                  <div
                    key={m.id}
                    className="p-4 sm:p-5 rounded-2xl border border-brand-accent/30 bg-canvas-warm/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-[#fff7dd] to-[#fae8b2] border border-brand-accent flex items-center justify-center text-base font-bold text-brand-primary shrink-0">
                        {m.photoUrl ? (
                          <img src={m.photoUrl} alt={m.fullName} className="w-full h-full object-cover" />
                        ) : (
                          m.fullName ? m.fullName.charAt(0) : "M"
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="text-sm font-bold text-brand-primary truncate">{m.fullName}</h3>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full va-badge-gold uppercase shrink-0">
                            {m.relationToHead}
                          </span>
                          {age !== null && (
                            <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full shrink-0">
                              {age} yrs
                            </span>
                          )}
                          {isClaimedBySelf ? (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-300 shrink-0">
                              🔒 Self-Claimed &amp; Locked
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-300 shrink-0">
                              👤 Managed by Head
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-body-heading truncate">
                          {m.professionTitle || m.profession || "Profession not listed"} {m.fatherName && `• s/o ${m.fatherName}`}
                        </p>
                        <p className="text-[11px] text-body-muted truncate">
                          {m.currentCity || household.nativePlace}, {m.currentCountry || "India"} {age !== null && `• Age: ${age} yrs`}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 self-stretch sm:self-center shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-brand-accent/15">
                      {canEditThisMember && (
                        <button
                          type="button"
                          onClick={() => openEditMemberModal(m)}
                          className="flex-1 sm:flex-initial text-center px-3.5 py-1.5 rounded-full text-xs font-bold text-white va-btn-join transition-all shadow-xs"
                        >
                          ✏️ Edit Profile
                        </button>
                      )}

                      {!m.ownerLocked && m.relationToHead !== "self" && (
                        <button
                          type="button"
                          onClick={() => handleCopyClaimLink(m.id)}
                          className="flex-1 sm:flex-initial text-center px-3.5 py-1.5 rounded-full text-xs font-bold text-brand-primary bg-white border border-brand-accent hover:bg-canvas-warm transition-all"
                        >
                          {copiedToken === m.id ? "✓ Link Copied!" : "Invite to Claim"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* EDIT MEMBER PROFILE MODAL */}
      {editingMember && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white border-2 border-brand-accent rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-warmLg my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-brand-accent/20 mb-5">
              <div>
                <h2 className="text-lg font-bold text-brand-primary">
                  Edit Member Profile • {editingMember.fullName || "Member"}
                </h2>
                <p className="text-xs text-body-muted">
                  Update personal details, bio, photo, and visibility. Phone & Email are permanently locked.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingMember(null)}
                className="w-8 h-8 rounded-full bg-canvas-warm text-body-muted hover:text-brand-primary font-bold flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMember} className="space-y-4">
              {/* Photo Upload Section */}
              <div className="p-4 rounded-2xl bg-canvas-warm/30 border border-brand-accent/30 flex items-center gap-4">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-white border border-brand-accent flex items-center justify-center text-xl font-bold text-brand-primary shrink-0 shadow-inner">
                  {editingMember.photoUrl ? (
                    <img src={editingMember.photoUrl} alt={editingMember.fullName} className="w-full h-full object-cover" />
                  ) : (
                    editingMember.fullName ? editingMember.fullName.charAt(0) : "M"
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-body-heading mb-1">
                    Profile Photo (प्रोफ़ाइल फ़ोटो)
                  </label>
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer px-3.5 py-1.5 rounded-lg text-xs font-bold bg-white text-brand-primary border border-brand-accent hover:bg-canvas-warm transition-all">
                      <span>Upload New Photo</span>
                      <input
                        type="file"
                        accept="image/*,image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif"
                        className="hidden"
                        onChange={handlePhotoUpload}
                      />
                    </label>
                    {editingMember.photoUrl && (
                      <button
                        type="button"
                        onClick={() => setEditingMember({ ...editingMember, photoUrl: "" })}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <span className="text-[10px] text-body-muted block mt-1">Max 2MB &bull; JPG, PNG or WebP</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold text-body-heading mb-1">
                    Full Name (पूरा नाम) *
                  </label>
                  <input
                    type="text"
                    value={editingMember.fullName || ""}
                    onChange={(e) => setEditingMember({ ...editingMember, fullName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-brand-accent/40 text-xs text-body-heading bg-white focus:ring-1 focus:ring-brand-primary"
                    required
                  />
                </div>

                {/* Father's / Husband's Name */}
                <div>
                  <label className="block text-xs font-bold text-body-heading mb-1">
                    {editingMember.maritalStatus === "Married" && (editingMember.gender === "Female" || editingMember.relationToHead === "spouse")
                      ? "Father's / Husband's Name (पिता / पति का नाम) *"
                      : "Father's Full Name (पिता का नाम) *"}
                  </label>
                  <input
                    type="text"
                    required
                    value={editingMember.fatherName || ""}
                    onChange={(e) => setEditingMember({ ...editingMember, fatherName: e.target.value })}
                    placeholder={
                      editingMember.maritalStatus === "Married" && (editingMember.gender === "Female" || editingMember.relationToHead === "spouse")
                        ? "e.g. Husband's or Father's Name"
                        : "e.g. Shri Ramesh Agarwal"
                    }
                    className="w-full px-3 py-2 rounded-xl border border-brand-accent/40 text-xs text-body-heading bg-white focus:ring-1 focus:ring-brand-primary"
                  />
                </div>

                {/* Date of Birth */}
                <div>
                  <label className="block text-xs font-bold text-body-heading mb-1">
                    Date of Birth (जन्म तिथि)
                  </label>
                  <input
                    type="date"
                    value={editingMember.dob ? String(editingMember.dob).split("T")[0] : ""}
                    onChange={(e) => setEditingMember({ ...editingMember, dob: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-brand-accent/40 text-xs text-body-heading bg-white focus:ring-1 focus:ring-brand-primary"
                  />
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-xs font-bold text-body-heading mb-1">
                    Gender (लिंग)
                  </label>
                  <select
                    value={editingMember.gender || "Male"}
                    onChange={(e) => setEditingMember({ ...editingMember, gender: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-brand-accent/40 text-xs text-body-heading bg-white focus:ring-1 focus:ring-brand-primary"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Marital Status */}
                <div>
                  <label className="block text-xs font-bold text-body-heading mb-1">
                    Marital Status (वैवाहिक स्थिति)
                  </label>
                  <select
                    value={editingMember.maritalStatus || "Married"}
                    onChange={(e) => setEditingMember({ ...editingMember, maritalStatus: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-brand-accent/40 text-xs text-body-heading bg-white focus:ring-1 focus:ring-brand-primary"
                  >
                    <option value="Married">Married</option>
                    <option value="Unmarried">Unmarried</option>
                    <option value="Widowed">Widowed</option>
                    <option value="Divorced">Divorced</option>
                  </select>
                </div>

                {/* Wedding Anniversary Date (Optional for Married) */}
                {editingMember.maritalStatus === "Married" && (
                  <div>
                    <label className="block text-xs font-bold text-body-heading mb-1">
                      Wedding Anniversary (विवाह तिथि)
                    </label>
                    <input
                      type="date"
                      value={editingMember.anniversaryDate ? String(editingMember.anniversaryDate).split("T")[0] : ""}
                      onChange={(e) => setEditingMember({ ...editingMember, anniversaryDate: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-brand-accent/40 text-xs text-body-heading bg-white focus:ring-1 focus:ring-brand-primary"
                    />
                  </div>
                )}

                {/* Profession Title */}
                <div>
                  <label className="block text-xs font-bold text-body-heading mb-1">
                    Profession Title (व्यवसाय / पद)
                  </label>
                  <input
                    type="text"
                    value={editingMember.professionTitle || editingMember.profession || ""}
                    onChange={(e) =>
                      setEditingMember({
                        ...editingMember,
                        professionTitle: e.target.value,
                        profession: e.target.value,
                      })
                    }
                    placeholder="e.g. Business Owner / Software Engineer"
                    className="w-full px-3 py-2 rounded-xl border border-brand-accent/40 text-xs text-body-heading bg-white focus:ring-1 focus:ring-brand-primary"
                  />
                </div>

                {/* Company / Business Name */}
                <div>
                  <label className="block text-xs font-bold text-body-heading mb-1">
                    Company / Business (कंपनी का नाम)
                  </label>
                  <input
                    type="text"
                    value={editingMember.companyName || ""}
                    onChange={(e) => setEditingMember({ ...editingMember, companyName: e.target.value })}
                    placeholder="e.g. Agarwal Jewellers / TCS"
                    className="w-full px-3 py-2 rounded-xl border border-brand-accent/40 text-xs text-body-heading bg-white focus:ring-1 focus:ring-brand-primary"
                  />
                </div>

                {/* Profession Description */}
                <div className="col-span-full">
                  <label className="block text-xs font-bold text-body-heading mb-1">
                    Profession Summary (कार्य का विवरण)
                  </label>
                  <input
                    type="text"
                    value={editingMember.professionDescription || ""}
                    onChange={(e) => setEditingMember({ ...editingMember, professionDescription: e.target.value })}
                    placeholder="Brief description of work, specialization, or business domain..."
                    className="w-full px-3 py-2 rounded-xl border border-brand-accent/40 text-xs text-body-heading bg-white focus:ring-1 focus:ring-brand-primary"
                  />
                </div>

                <div className="col-span-full">
                  <LocationSelector
                    country={editingMember.currentCountry || ""}
                    city={editingMember.currentCity || ""}
                    postalCode={editingMember.postalCode || ""}
                    state={editingMember.state || ""}
                    fullAddress={editingMember.fullAddress || ""}
                    onLocationChange={(locData: any) => 
                      setEditingMember({ 
                        ...editingMember, 
                        currentCountry: typeof locData === 'string' ? locData : locData.country, 
                        currentCity: typeof locData === 'string' ? (editingMember.currentCity || "") : locData.city,
                        postalCode: typeof locData === 'object' ? locData.postalCode : editingMember.postalCode,
                        state: typeof locData === 'object' ? locData.state : editingMember.state,
                        fullAddress: typeof locData === 'object' ? locData.fullAddress : editingMember.fullAddress,
                      })
                    }
                  />
                </div>
              </div>

              {/* Bio */}
              <div>
                <label className="block text-xs font-bold text-body-heading mb-1">
                  Bio / Brief Summary (संक्षिप्त परिचय)
                </label>
                <textarea
                  rows={2}
                  value={editingMember.bio || ""}
                  onChange={(e) => setEditingMember({ ...editingMember, bio: e.target.value })}
                  placeholder="Share a short note about education, interests, or community involvement..."
                  className="w-full px-3 py-2 rounded-xl border border-brand-accent/40 text-xs text-body-heading bg-white focus:ring-1 focus:ring-brand-primary"
                />
              </div>

              {/* LOCKED PHONE & EMAIL SECTION */}
              <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm">🔒</span>
                  <span className="text-xs font-bold text-amber-900">Protected Contact Identifiers (Locked)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-body-heading">
                  <div className="p-2.5 rounded-xl bg-white border border-amber-200">
                    <span className="text-[10px] text-body-muted block">Registered Mobile Phone</span>
                    <strong>{editingMember.phone || "Not provided"}</strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-amber-200">
                    <span className="text-[10px] text-body-muted block">Registered Email</span>
                    <strong>{editingMember.email || "Not provided"}</strong>
                  </div>
                </div>
                <p className="text-[10px] text-amber-800">
                  Primary phone and email are cryptographically verified identity credentials and cannot be edited directly.
                </p>
              </div>

              {/* PRIVACY VISIBILITY CONTROLS */}
              <div className="p-4 rounded-2xl bg-canvas-warm/30 border border-brand-accent/30 space-y-3">
                <h4 className="text-xs font-bold text-brand-primary">Privacy & Directory Visibility</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-body-heading mb-1">
                      Contact Visibility
                    </label>
                    <select
                      value={editingMember.visibility?.contactInfo || "members_only"}
                      onChange={(e) =>
                        setEditingMember({
                          ...editingMember,
                          visibility: { ...editingMember.visibility, contactInfo: e.target.value as any },
                        })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg border border-brand-accent/40 text-xs bg-white focus:ring-1 focus:ring-brand-primary"
                    >
                      <option value="members_only">Verified Members Only</option>
                      <option value="hidden">Hidden from All</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-body-heading mb-1">
                      Date of Birth
                    </label>
                    <select
                      value={editingMember.visibility?.dob || "hidden"}
                      onChange={(e) =>
                        setEditingMember({
                          ...editingMember,
                          visibility: { ...editingMember.visibility, dob: e.target.value as any },
                        })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg border border-brand-accent/40 text-xs bg-white focus:ring-1 focus:ring-brand-primary"
                    >
                      <option value="hidden">Hidden</option>
                      <option value="members_only">Verified Members Only</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-body-heading mb-1">
                      Profile Photo
                    </label>
                    <select
                      value={editingMember.visibility?.photo || "public_to_members"}
                      onChange={(e) =>
                        setEditingMember({
                          ...editingMember,
                          visibility: { ...editingMember.visibility, photo: e.target.value as any },
                        })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg border border-brand-accent/40 text-xs bg-white focus:ring-1 focus:ring-brand-primary"
                    >
                      <option value="public_to_members">Visible to Members</option>
                      <option value="hidden">Hidden</option>
                    </select>
                  </div>
                </div>
              </div>

              {memberSaveError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
                  {memberSaveError}
                </div>
              )}
              {memberSaveSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
                  ✓ {memberSaveSuccess}
                </div>
              )}

              <div className="flex justify-end gap-2.5 pt-3 border-t border-brand-accent/20">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="px-5 py-2.5 rounded-full text-xs font-bold text-body-heading hover:bg-canvas-warm border border-brand-accent/30"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingMember}
                  className="px-6 py-2.5 rounded-full text-xs font-bold text-white va-btn-join shadow-goldCta"
                >
                  {isSavingMember ? "Saving Changes..." : "Save Profile Changes ✓"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT HOUSEHOLD ORIGIN MODAL */}
      {isEditingHousehold && household && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white border-2 border-brand-accent rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-warmLg">
            <div className="flex items-center justify-between pb-3 border-b border-brand-accent/20 mb-4">
              <h3 className="text-base font-bold text-brand-primary">Edit Family Origin & Gotra</h3>
              <button
                type="button"
                onClick={() => setIsEditingHousehold(false)}
                className="w-7 h-7 rounded-full bg-canvas-warm text-body-muted hover:text-brand-primary font-bold flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveHousehold} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-body-heading mb-1">
                  18 Gotras Lineage (गोत्र) *
                </label>
                <select
                  value={householdGotra}
                  onChange={(e) => setHouseholdGotra(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-brand-accent/40 text-xs text-body-heading bg-white focus:ring-1 focus:ring-brand-primary"
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
                  Native Place / Ancestral Town (मूल निवास) *
                </label>
                <input
                  type="text"
                  value={householdNativePlace}
                  onChange={(e) => setHouseholdNativePlace(e.target.value)}
                  placeholder="e.g. Agroha, Haryana"
                  className="w-full px-3 py-2 rounded-xl border border-brand-accent/40 text-xs text-body-heading bg-white focus:ring-1 focus:ring-brand-primary"
                  required
                />
              </div>

              {householdSaveError && (
                <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                  {householdSaveError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-brand-accent/20">
                <button
                  type="button"
                  onClick={() => setIsEditingHousehold(false)}
                  className="px-4 py-2 rounded-full text-xs font-bold text-body-heading hover:bg-canvas-warm border border-brand-accent/30"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingHousehold}
                  className="px-5 py-2 rounded-full text-xs font-bold text-white va-btn-join shadow-goldCta"
                >
                  {isSavingHousehold ? "Saving..." : "Save Family Origin ✓"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}