'use client';

import React, { useState, useEffect, useMemo } from "react";
import { gotras } from "@/data/gotras";
import {
  adminCorrectMemberDetailsAction,
  getSupportAuditLogsAction,
} from "@/actions/support-session";
import type { AdminSupportAuditLog } from "@/types/support-session";
import type { Household, Member } from "@/types/household";
import { ShieldCheck, History, Clock, UserCheck } from "./AdminSupportIcons";

interface AdminSupportCorrectionFormProps {
  sessionId: string;
  household: Household;
  initialMemberId?: string | null;
  onCorrectionSaved?: (updatedHousehold: Household) => void;
  onClose?: () => void;
}

const GENDERS = ["Male", "Female", "Other"] as const;
const MARITAL_STATUSES = [
  "Married",
  "Unmarried",
  "Single",
  "Widowed",
  "Divorced",
] as const;

export default function AdminSupportCorrectionForm({
  sessionId,
  household,
  initialMemberId,
  onCorrectionSaved,
}: AdminSupportCorrectionFormProps) {
  // 1. Identify members in household
  const members = useMemo(() => {
    if (household.members && household.members.length > 0) {
      return household.members;
    }
    // Fallback pseudo-member from head if household.members is empty
    return [
      {
        id: household.headUserId || household.id,
        fullName: household.headName,
        relationToHead: "self" as const,
        gender: "Male",
        maritalStatus: "Married",
        currentCity: household.city || "",
        currentCountry: household.country || "India",
        profession: "",
        verifiedBySelf: true,
        ownerLocked: false,
        visibility: { contactInfo: "members_only", dob: "members_only", photo: "public_to_members" },
      } as Member,
    ];
  }, [household]);

  const [selectedMemberId, setSelectedMemberId] = useState<string>(() => {
    if (initialMemberId && members.some((m) => m.id === initialMemberId)) {
      return initialMemberId;
    }
    return members[0]?.id || household.headUserId || household.id;
  });

  const selectedMember = useMemo(() => {
    return members.find((m) => m.id === selectedMemberId) || members[0];
  }, [members, selectedMemberId]);

  // 2. Form state
  const [fullName, setFullName] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [dob, setDob] = useState("");
  const [isDobNotSpecified, setIsDobNotSpecified] = useState(false);
  const [gender, setGender] = useState<string>("Male");
  const [maritalStatus, setMaritalStatus] = useState<string>("Married");
  const [gotra, setGotra] = useState<string>(household.gotra || "Garg");
  const [nativePlace, setNativePlace] = useState<string>(household.nativePlace || "");
  const [reason, setReason] = useState("");

  // UI status states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Audit logs state
  const [auditLogs, setAuditLogs] = useState<AdminSupportAuditLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // Populate form whenever selectedMember or household changes
  useEffect(() => {
    if (!selectedMember) return;
    setFullName(selectedMember.fullName || "");
    setFatherName(selectedMember.fatherName || "");
    const memberDob = selectedMember.dob ? String(selectedMember.dob).split("T")[0] : "";
    if (memberDob && memberDob !== "Not specified") {
      setDob(memberDob);
      setIsDobNotSpecified(false);
    } else {
      setDob("");
      setIsDobNotSpecified(true);
    }
    setGender(selectedMember.gender || "Male");
    setMaritalStatus(selectedMember.maritalStatus || "Married");
    setGotra(household.gotra || "Garg");
    setNativePlace(household.nativePlace || "");
    setStatusMessage(null);
  }, [selectedMember, household]);

  // Load audit logs for this session
  const loadAuditLogs = async () => {
    if (!sessionId) return;
    setIsLoadingLogs(true);
    try {
      const res = await getSupportAuditLogsAction({ sessionId });
      if (res.success && res.logs) {
        setAuditLogs(res.logs);
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, [sessionId]);

  // 3. Compute baseline vs modified diff
  const baseValues = useMemo(() => {
    if (!selectedMember) return null;
    const baseDob = selectedMember.dob ? String(selectedMember.dob).split("T")[0] : "";
    return {
      fullName: selectedMember.fullName || "",
      fatherName: selectedMember.fatherName || "",
      dob: baseDob && baseDob !== "Not specified" ? baseDob : null,
      gender: selectedMember.gender || "Male",
      maritalStatus: selectedMember.maritalStatus || "Married",
      gotra: household.gotra || "Garg",
      nativePlace: household.nativePlace || "",
    };
  }, [selectedMember, household]);

  const activeDiff = useMemo(() => {
    if (!baseValues) return [];
    const diffs: { field: string; label: string; oldVal: string; newVal: string }[] = [];

    // Full Name
    if (fullName.trim() !== baseValues.fullName) {
      diffs.push({
        field: "fullName",
        label: "Full Name",
        oldVal: baseValues.fullName || "(empty)",
        newVal: fullName.trim() || "(empty)",
      });
    }

    // Father's Name
    if (fatherName.trim() !== baseValues.fatherName) {
      diffs.push({
        field: "fatherName",
        label: "Father's / Husband's Name",
        oldVal: baseValues.fatherName || "(empty)",
        newVal: fatherName.trim() || "(empty)",
      });
    }

    // Date of birth
    const effectiveNewDob = isDobNotSpecified ? null : dob || null;
    if (effectiveNewDob !== baseValues.dob) {
      diffs.push({
        field: "dob",
        label: "Date of Birth",
        oldVal: baseValues.dob || "Not specified",
        newVal: effectiveNewDob || "Not specified",
      });
    }

    // Gender
    if (gender !== baseValues.gender) {
      diffs.push({
        field: "gender",
        label: "Gender",
        oldVal: baseValues.gender,
        newVal: gender,
      });
    }

    // Marital Status
    if (maritalStatus !== baseValues.maritalStatus) {
      diffs.push({
        field: "maritalStatus",
        label: "Marital Status",
        oldVal: baseValues.maritalStatus,
        newVal: maritalStatus,
      });
    }

    // Gotra
    if (gotra !== baseValues.gotra) {
      diffs.push({
        field: "gotra",
        label: "Gotra (Household)",
        oldVal: baseValues.gotra,
        newVal: gotra,
      });
    }

    // Native Place
    if (nativePlace.trim() !== baseValues.nativePlace) {
      diffs.push({
        field: "nativePlace",
        label: "Native Place (Household)",
        oldVal: baseValues.nativePlace || "(empty)",
        newVal: nativePlace.trim() || "(empty)",
      });
    }

    return diffs;
  }, [baseValues, fullName, fatherName, dob, isDobNotSpecified, gender, maritalStatus, gotra, nativePlace]);

  // Form submission handler
  const handleSubmitCorrections = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;

    if (activeDiff.length === 0) {
      setStatusMessage({
        type: "error",
        text: "No changes detected. Please modify at least one field before saving.",
      });
      return;
    }

    const cleanReason = reason.trim();
    if (!cleanReason || cleanReason.length < 3) {
      setStatusMessage({
        type: "error",
        text: "A mandatory reason for this correction is required for the audit log (minimum 3 characters).",
      });
      return;
    }

    if (fullName.trim().length < 2) {
      setStatusMessage({
        type: "error",
        text: "Full Name must be at least 2 characters.",
      });
      return;
    }

    if (fatherName.trim() && fatherName.trim().length < 2) {
      setStatusMessage({
        type: "error",
        text: "Father's/Husband's Name must be at least 2 characters if provided.",
      });
      return;
    }

    if (nativePlace.trim() && nativePlace.trim().length < 2) {
      setStatusMessage({
        type: "error",
        text: "Native Place must be at least 2 characters if provided.",
      });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    const updates: Record<string, any> = {
      fullName: fullName.trim(),
      fatherName: fatherName.trim() || null,
      dob: isDobNotSpecified ? "Not specified" : (dob || null),
      gender,
      maritalStatus,
      gotra,
      nativePlace: nativePlace.trim(),
    };

    try {
      const res = await adminCorrectMemberDetailsAction({
        sessionId,
        memberId: selectedMember.id,
        updates,
        reason: cleanReason,
      });

      if (res.success) {
        setStatusMessage({
          type: "success",
          text: res.message || "Member details corrected and immutable audit log recorded successfully!",
        });
        setReason("");

        // Refresh audit logs
        await loadAuditLogs();

        // Update local household copy and notify parent
        const updatedMembers = members.map((m) =>
          m.id === selectedMember.id
            ? {
                ...m,
                fullName: updates.fullName,
                fatherName: updates.fatherName,
                dob: updates.dob === "Not specified" ? undefined : updates.dob,
                gender: updates.gender,
                maritalStatus: updates.maritalStatus,
              }
            : m
        );

        const updatedHh: Household = {
          ...household,
          gotra: updates.gotra,
          nativePlace: updates.nativePlace,
          headName: selectedMember.relationToHead === "self" ? updates.fullName : household.headName,
          members: updatedMembers,
        };

        if (onCorrectionSaved) {
          onCorrectionSaved(updatedHh);
        }
      } else {
        setStatusMessage({
          type: "error",
          text: res.error || "Failed to save corrections.",
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err?.message || "An unexpected error occurred while saving corrections.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 text-xs text-body-text">
      {/* Member selector tabs if multiple members exist */}
      {members.length > 1 && (
        <div className="bg-canvas-warm/40 p-3 rounded-2xl border border-brand-accent/20">
          <label className="block text-xs font-bold text-body-heading mb-2">
            Select Household Member to Correct:
          </label>
          <div className="flex flex-wrap gap-2">
            {members.map((m) => {
              const isSelected = m.id === selectedMemberId;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedMemberId(m.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 min-h-[40px] ${
                    isSelected
                      ? "bg-brand-primary text-white shadow-xs"
                      : "bg-white text-body-heading border border-brand-accent/30 hover:bg-amber-50"
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>{m.fullName}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isSelected ? "bg-white/20 text-white" : "bg-gray-100 text-body-muted"
                    }`}
                  >
                    {m.relationToHead === "self" ? "Head" : m.relationToHead}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Editing target banner */}
      <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center shrink-0">
            <UserCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-amber-950">
                Correcting: {selectedMember?.fullName}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900">
                {selectedMember?.relationToHead === "self" ? "Head of Household" : selectedMember?.relationToHead}
              </span>
            </div>
            <p className="text-xs text-amber-800 mt-0.5">
              Household #{household.serialNo || household.householdCode} • Current Gotra: {household.gotra}
            </p>
          </div>
        </div>
        <div className="text-xs text-amber-900 font-mono font-medium">
          Session ID: {sessionId.slice(0, 8)}...
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-medium animate-in fade-in ${
            statusMessage.type === "success"
              ? "bg-emerald-50 border-emerald-300 text-emerald-950"
              : "bg-red-50 border-red-300 text-red-950"
          }`}
        >
          {statusMessage.type === "success" ? "✓ " : "✕ "}
          {statusMessage.text}
        </div>
      )}

      {/* Main Correction Form */}
      <form onSubmit={handleSubmitCorrections} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-bold text-body-heading mb-1.5">
              Full Name <span className="text-red-600">*</span>
              <span className="text-body-muted font-normal ml-1">
                (e.g. Krishna Bansal, Astitva Agrawal)
              </span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                if (statusMessage) setStatusMessage(null);
              }}
              required
              minLength={2}
              className="w-full px-3.5 py-2.5 bg-canvas-warm/40 border border-brand-accent/30 rounded-xl text-xs text-body-heading focus:outline-none focus:ring-2 focus:ring-brand-primary min-h-[40px]"
              placeholder="Full Name as per official records"
            />
          </div>

          {/* Father's / Husband's Name */}
          <div>
            <label className="block text-xs font-bold text-body-heading mb-1.5">
              Father&apos;s / Husband&apos;s Name
            </label>
            <input
              type="text"
              value={fatherName}
              onChange={(e) => {
                setFatherName(e.target.value);
                if (statusMessage) setStatusMessage(null);
              }}
              className="w-full px-3.5 py-2.5 bg-canvas-warm/40 border border-brand-accent/30 rounded-xl text-xs text-body-heading focus:outline-none focus:ring-2 focus:ring-brand-primary min-h-[40px]"
              placeholder="e.g. Shri Omprakash Bansal"
            />
          </div>

          {/* Date of Birth with 'Not specified' toggle */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-body-heading">
                Date of Birth
              </label>
              <label className="flex items-center gap-1.5 text-xs text-body-muted cursor-pointer">
                <input
                  type="checkbox"
                  checked={isDobNotSpecified}
                  onChange={(e) => {
                    setIsDobNotSpecified(e.target.checked);
                    if (e.target.checked) setDob("");
                    if (statusMessage) setStatusMessage(null);
                  }}
                  className="rounded border-brand-accent/40 text-brand-primary focus:ring-brand-primary w-3.5 h-3.5"
                />
                <span>Not specified</span>
              </label>
            </div>
            <input
              type="date"
              value={dob}
              disabled={isDobNotSpecified}
              onChange={(e) => {
                setDob(e.target.value);
                if (statusMessage) setStatusMessage(null);
              }}
              className={`w-full px-3.5 py-2.5 bg-canvas-warm/40 border border-brand-accent/30 rounded-xl text-xs text-body-heading focus:outline-none focus:ring-2 focus:ring-brand-primary min-h-[40px] ${
                isDobNotSpecified ? "opacity-50 cursor-not-allowed bg-gray-100" : ""
              }`}
            />
          </div>

          {/* Gender */}
          <div>
            <label className="block text-xs font-bold text-body-heading mb-1.5">
              Gender <span className="text-red-600">*</span>
            </label>
            <select
              value={gender}
              onChange={(e) => {
                setGender(e.target.value);
                if (statusMessage) setStatusMessage(null);
              }}
              className="w-full px-3.5 py-2.5 bg-canvas-warm/40 border border-brand-accent/30 rounded-xl text-xs text-body-heading focus:outline-none focus:ring-2 focus:ring-brand-primary min-h-[40px]"
            >
              {GENDERS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          {/* Marital Status */}
          <div>
            <label className="block text-xs font-bold text-body-heading mb-1.5">
              Marital Status <span className="text-red-600">*</span>
            </label>
            <select
              value={maritalStatus}
              onChange={(e) => {
                setMaritalStatus(e.target.value);
                if (statusMessage) setStatusMessage(null);
              }}
              className="w-full px-3.5 py-2.5 bg-canvas-warm/40 border border-brand-accent/30 rounded-xl text-xs text-body-heading focus:outline-none focus:ring-2 focus:ring-brand-primary min-h-[40px]"
            >
              {MARITAL_STATUSES.map((ms) => (
                <option key={ms} value={ms}>
                  {ms}
                </option>
              ))}
            </select>
          </div>

          {/* Gotra (Household-level) */}
          <div>
            <label className="block text-xs font-bold text-body-heading mb-1.5">
              Gotra <span className="text-body-muted font-normal">(18 Recognized Gotras)</span>
            </label>
            <select
              value={gotra}
              onChange={(e) => {
                setGotra(e.target.value);
                if (statusMessage) setStatusMessage(null);
              }}
              className="w-full px-3.5 py-2.5 bg-canvas-warm/40 border border-brand-accent/30 rounded-xl text-xs text-body-heading focus:outline-none focus:ring-2 focus:ring-brand-primary min-h-[40px]"
            >
              {gotras.map((g) => (
                <option key={g.name} value={g.name}>
                  {g.name} ({g.devanagari})
                </option>
              ))}
            </select>
          </div>

          {/* Native Place */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-body-heading mb-1.5">
              Ancestral Native Place
            </label>
            <input
              type="text"
              value={nativePlace}
              onChange={(e) => {
                setNativePlace(e.target.value);
                if (statusMessage) setStatusMessage(null);
              }}
              className="w-full px-3.5 py-2.5 bg-canvas-warm/40 border border-brand-accent/30 rounded-xl text-xs text-body-heading focus:outline-none focus:ring-2 focus:ring-brand-primary min-h-[40px]"
              placeholder="e.g. Agroha, Haryana / Hisar / Pilani"
            />
          </div>

          {/* Reason for Correction (Mandatory) */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-body-heading mb-1.5">
              Reason for Correction <span className="text-red-600">*</span>
              <span className="text-body-muted font-normal ml-1">
                (Immutable audit requirement, minimum 3 characters)
              </span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (statusMessage) setStatusMessage(null);
              }}
              required
              minLength={3}
              rows={2}
              className="w-full p-3 bg-canvas-warm/40 border border-brand-accent/30 rounded-xl text-xs text-body-heading focus:outline-none focus:ring-2 focus:ring-brand-primary"
              placeholder="e.g. Member requested fix for spelling error in Name and Father's Name via support ticket"
            />
          </div>
        </div>

        {/* Visual Diff Review Box */}
        <div className="bg-canvas-warm/30 rounded-2xl border border-brand-accent/30 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-body-heading flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-brand-primary" />
              <span>Visual Diff Review (Pre-Commit Audit Preview)</span>
            </span>
            <span className="text-[11px] font-bold text-body-muted">
              {activeDiff.length} field{activeDiff.length === 1 ? "" : "s"} modified
            </span>
          </div>

          {activeDiff.length === 0 ? (
            <p className="text-xs text-body-muted italic py-2">
              No modifications detected. Edit any field above to preview old vs. new values.
            </p>
          ) : (
            <div className="space-y-2 mt-2">
              {activeDiff.map((d) => (
                <div
                  key={d.field}
                  className="bg-white p-2.5 rounded-xl border border-brand-accent/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <span className="font-bold text-xs text-brand-primary min-w-[160px]">
                    {d.label}:
                  </span>
                  <div className="flex items-center gap-2 flex-1 flex-wrap text-xs">
                    <span className="line-through text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                      {d.oldVal}
                    </span>
                    <span className="text-body-muted">→</span>
                    <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                      {d.newVal}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Primary CTA Button (44px touch target) */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting || activeDiff.length === 0 || !reason.trim()}
            className="w-full h-11 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-primary hover:bg-brand-primary/95 disabled:opacity-50 disabled:cursor-not-allowed shadow-warm transition-all flex items-center justify-center gap-2 min-h-[44px]"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>
              {isSubmitting
                ? "Saving & Recording Audit Trail..."
                : activeDiff.length === 0
                ? "Review Changes"
                : "Apply Corrections"}
            </span>
          </button>
        </div>
      </form>

      {/* Audit Log Display Panel */}
      <div className="border-t border-brand-accent/20 pt-5 mt-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <History className="w-4 h-4 text-brand-primary" />
            <h4 className="text-xs font-bold text-body-heading uppercase tracking-wider">
              Immutable Session Audit Trail
            </h4>
          </div>
          <button
            type="button"
            onClick={loadAuditLogs}
            disabled={isLoadingLogs}
            className="text-xs font-bold text-brand-primary hover:underline flex items-center gap-1 min-h-[32px] px-2"
          >
            <span>🔄</span>
            <span>{isLoadingLogs ? "Refreshing..." : "Refresh Logs"}</span>
          </button>
        </div>

        {auditLogs.length === 0 ? (
          <div className="p-4 bg-white rounded-2xl border border-brand-accent/20 text-center text-xs text-body-muted">
            No corrections recorded in this session yet.
          </div>
        ) : (
          <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="bg-white p-3 rounded-2xl border border-brand-accent/30 shadow-2xs space-y-1.5"
              >
                <div className="flex items-center justify-between text-[11px] text-body-muted">
                  <span className="font-semibold text-body-heading flex items-center gap-1">
                    <Clock className="w-3 h-3 text-body-muted" />
                    <span>
                      {new Date(log.createdAt).toLocaleString("en-SG", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </span>
                  <span className="font-mono text-brand-primary">Admin: {log.adminId}</span>
                </div>

                <p className="text-xs text-body-heading">
                  <strong>Reason:</strong> {log.reason}
                </p>

                {log.changes && Object.keys(log.changes).length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {Object.entries(log.changes).map(([field, delta]: [string, any]) => (
                      <span
                        key={field}
                        className="inline-flex items-center gap-1 text-[11px] bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg"
                      >
                        <strong className="text-amber-950 capitalize">{field}:</strong>
                        <span className="line-through text-red-600">{String(delta.old ?? "null")}</span>
                        <span>→</span>
                        <span className="font-bold text-emerald-700">{String(delta.new ?? "null")}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
