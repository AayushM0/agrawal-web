'use server';

import crypto from "crypto";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { getSession } from "@/actions/auth";
import { enqueueEmail } from "@/lib/email-queue";
import { maskEmail } from "@/lib/privacy";
import { gotras } from "@/data/gotras";
import { getClientIp } from "@/lib/turnstile";
import type {
  AdminSupportSession,
  AdminSupportAuditLog,
} from "@/types/support-session";

async function getAdminIp(): Promise<string> {
  try {
    const h = await headers();
    return getClientIp(h);
  } catch {
    return "127.0.0.1";
  }
}

function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("Missing AUTH_SECRET environment variable");
  }
  return secret;
}

function hashSupportOtp(otp: string): string {
  const secret = getAuthSecret();
  return crypto.createHmac("sha256", secret).update(otp.trim()).digest("hex");
}

function verifySupportOtpHash(otp: string, expectedHash: string): boolean {
  try {
    const computedHash = hashSupportOtp(otp);
    const computedBuf = Buffer.from(computedHash, "hex");
    const expectedBuf = Buffer.from(expectedHash, "hex");
    if (computedBuf.length !== expectedBuf.length) {
      return false;
    }
    return crypto.timingSafeEqual(computedBuf, expectedBuf);
  } catch {
    return false;
  }
}

export interface RequestAdminSupportSessionInput {
  householdId: string;
  memberId?: string | null;
  reason: string;
  recipientEmailOverride?: string;
}

export interface RequestAdminSupportSessionResult {
  success: boolean;
  error?: string;
  sessionId?: string;
  maskedEmail?: string;
  maskedRecipient?: string;
  expiresAt?: string;
  devOtp?: string;
}

/**
 * Request an admin support session for a household or member.
 * Generates an OTP, stores a pending session, and emails the member/head.
 */
export async function requestAdminSupportSession(
  input: RequestAdminSupportSessionInput
): Promise<RequestAdminSupportSessionResult> {
  // 1. Enforce session.role === 'admin'
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return { success: false, error: "Unauthorized: Admin privileges required." };
  }

  const { householdId, memberId, reason, recipientEmailOverride } = input;

  if (!householdId) {
    return { success: false, error: "Household ID is required." };
  }

  const cleanReason = reason?.trim();
  if (!cleanReason || cleanReason.length < 3) {
    return { success: false, error: "A valid reason for the support session is required (minimum 3 characters)." };
  }

  // 2. Validate household/member exists via DB
  const household = await db.getHouseholdById(householdId);
  if (!household) {
    return { success: false, error: "Household not found." };
  }

  let member: any = null;
  if (memberId) {
    member = await db.getMemberById(memberId);
    if (!member) {
      return { success: false, error: "Specified member not found." };
    }
    if (member.householdId && String(member.householdId) !== String(household.id) && String(member.householdId) !== String(household.householdCode)) {
      return { success: false, error: "Member does not belong to the specified household." };
    }
  }

  // 3. Identify recipient email
  let targetEmail: string | null = null;
  let recipientName = "Valued Member";

  if (recipientEmailOverride && recipientEmailOverride.includes("@")) {
    targetEmail = recipientEmailOverride.trim();
  } else if (member?.email && member.email.includes("@")) {
    targetEmail = member.email.trim();
    recipientName = member.fullName || recipientName;
  } else if (household.verifiedContact && household.verifiedContact.includes("@")) {
    targetEmail = household.verifiedContact.trim();
    recipientName = household.headName || recipientName;
  } else if (household.headEmail && household.headEmail.includes("@")) {
    targetEmail = household.headEmail.trim();
    recipientName = household.headName || recipientName;
  } else if (household.members && Array.isArray(household.members)) {
    const headMember = household.members.find((m: any) => m.relationToHead === "self" || m.id === household.headUserId);
    if (headMember?.email && headMember.email.includes("@")) {
      targetEmail = headMember.email.trim();
      recipientName = headMember.fullName || recipientName;
    }
  }

  if (!targetEmail) {
    return {
      success: false,
      error: "No registered email address found for this household/member to receive authorization OTP.",
    };
  }

  // 4. Generate 6-digit cryptographic random OTP code
  const generatedCode = crypto.randomInt(100000, 1000000).toString();

  // 5. Hash OTP using HMAC-SHA256 with AUTH_SECRET
  const otpHash = hashSupportOtp(generatedCode);
  const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min TTL

  // 6. Create pending support session using db.createSupportSession
  const createdSession = await db.createSupportSession({
    adminId: session.userId || session.contact || "admin",
    householdId: String(household.id),
    memberId: memberId ? String(memberId) : null,
    otpHash,
    otpExpiresAt,
    reason: cleanReason,
    status: "pending",
  });

  // 7. Queue authorization email to member/head registered email
  const masked = maskEmail(targetEmail);
  const emailHtml = `
    <div style="font-family: sans-serif; max-width: 550px; margin: 0 auto; background: #fffdf8; border: 1px solid #e69500; border-radius: 16px; padding: 24px;">
      <h2 style="color: #d9531e; margin-top: 0; text-align: center;">Maharaja Agrasen Foundation Limited Singapore</h2>
      <h3 style="color: #422b22; text-align: center;">Member-Authorized Support Session</h3>
      <p style="font-size: 14px; color: #422b22;">An administrator (<strong>${session.userId || "MAFL Administrator"}</strong>) has requested temporary authorization to assist with corrections to your profile details.</p>
      <div style="background: #fff8e6; border-left: 4px solid #e69500; padding: 12px; margin: 16px 0; border-radius: 4px;">
        <p style="margin: 0; font-size: 13px; color: #5c3b1e;"><strong>Reason stated:</strong> ${cleanReason}</p>
      </div>
      <p style="font-size: 14px; color: #422b22; text-align: center;">Your 6-digit authorization passcode is:</p>
      <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #d9531e; margin: 16px auto; background: #ffffff; padding: 12px; border-radius: 8px; border: 1px solid #fde08b; text-align: center; max-width: 240px;">
        ${generatedCode}
      </div>
      <div style="font-size: 12px; color: #7a5e52; line-height: 1.5; margin-top: 20px; border-top: 1px solid #f2e2cf; padding-top: 12px;">
        <p style="margin: 4px 0;"><strong>Security Notice:</strong> Providing this passcode to the administrator grants them a <strong>24-hour editing window</strong> to update your specified details. All corrections are immutably logged with an audit trace.</p>
        <p style="margin: 4px 0;">This passcode expires in 15 minutes. If you did not request support, please ignore this email.</p>
      </div>
    </div>
  `;

  const textBody = `Maharaja Agrasen Foundation Limited Singapore - Support Authorization\n\n` +
    `An administrator (${session.userId || "MAFL Administrator"}) has requested authorization to correct your profile details.\n` +
    `Reason: ${cleanReason}\n\n` +
    `Your 6-digit authorization code is: ${generatedCode}\n\n` +
    `Security Notice: Providing this code authorizes a 24-hour support session. All modifications are immutably logged in the audit trail.\n\n` +
    `This code expires in 15 minutes. If you did not request assistance, do not share this code.`;

  try {
    await enqueueEmail({
      recipientEmail: targetEmail,
      recipientName: recipientName,
      subject: `${generatedCode} is your MAFL Support Session Authorization Code`,
      htmlBody: emailHtml,
      textBody,
      metadata: {
        type: "admin_support_session_otp",
        sessionId: createdSession.id,
        householdId: String(household.id),
        memberId: memberId ? String(memberId) : null,
        adminId: session.userId || "admin",
      },
    });
  } catch (emailErr) {
    console.error("[SUPPORT SESSION] Failed to queue authorization email:", emailErr);
  }

  await db.recordPlatformAuditLog({
    adminId: session.userId || "admin",
    adminContact: session.contact || "admin",
    action: "SUPPORT_SESSION_REQUESTED",
    category: "SUPPORT_SESSION",
    severity: "INFO",
    targetType: memberId ? "member" : "household",
    targetId: memberId || householdId,
    details: { sessionId: createdSession.id, reason: cleanReason, maskedEmail: masked },
    ipAddress: await getAdminIp(),
  });

  return {
    success: true,
    sessionId: createdSession.id,
    maskedEmail: masked,
    maskedRecipient: masked,
    expiresAt: otpExpiresAt.toISOString(),
    ...(process.env.NODE_ENV !== "production" ? { devOtp: generatedCode } : {}),
  };
}

export interface VerifyAdminSupportSessionInput {
  sessionId: string;
  otp: string;
}

export interface VerifyAdminSupportSessionResult {
  success: boolean;
  error?: string;
  session?: AdminSupportSession;
}

/**
 * Verify OTP entered by admin and activate 24-hour support session.
 */
export async function verifyAdminSupportSession(
  input: VerifyAdminSupportSessionInput
): Promise<VerifyAdminSupportSessionResult> {
  // 1. Enforce admin role
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return { success: false, error: "Unauthorized: Admin privileges required." };
  }

  const { sessionId, otp } = input;
  if (!sessionId || !otp) {
    return { success: false, error: "Session ID and OTP are required." };
  }

  // 2. Query session via db.getSupportSessionById
  const supportSession = await db.getSupportSessionById(sessionId);
  if (!supportSession) {
    return { success: false, error: "Support session not found." };
  }

  // 3. Ensure otp_attempts < 3, session status is 'pending', and not expired
  if (supportSession.otpAttempts >= 3) {
    return { success: false, error: "Maximum OTP verification attempts exceeded (3/3). Please request a new session." };
  }

  if (supportSession.status !== "pending") {
    return { success: false, error: `Support session is not pending (current status: ${supportSession.status}).` };
  }

  if (new Date(supportSession.otpExpiresAt).getTime() < Date.now()) {
    await db.updateSupportSessionStatus(sessionId, "expired");
    return { success: false, error: "Verification OTP has expired. Please request a new support session." };
  }

  // 4. Verify OTP timing-safely. On failure, increment otp_attempts
  const cleanOtp = String(otp).trim();
  const isValid = verifySupportOtpHash(cleanOtp, supportSession.otpHash);
  if (!isValid) {
    const nextAttempts = (supportSession.otpAttempts || 0) + 1;
    await db.updateSupportSessionStatus(sessionId, nextAttempts >= 3 ? "expired" : supportSession.status, {
      otpAttempts: nextAttempts,
    });
    const remaining = Math.max(0, 3 - nextAttempts);
    return {
      success: false,
      error: remaining > 0
        ? `Invalid verification code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`
        : "Maximum OTP verification attempts exceeded (3/3). Please request a new session.",
    };
  }

  // 5. On success: call db.updateSupportSessionStatus(sessionId, 'active', { authorizedAt, expiresAt })
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours TTL
  const updatedSession = await db.updateSupportSessionStatus(sessionId, "active", {
    authorizedAt: now,
    expiresAt,
  });

  await db.recordPlatformAuditLog({
    adminId: session.userId || "admin",
    adminContact: session.contact || "admin",
    action: "SUPPORT_SESSION_AUTHORIZED",
    category: "SUPPORT_SESSION",
    severity: "INFO",
    targetType: "support_session",
    targetId: sessionId,
    details: { expiresAt: updatedSession?.expiresAt || expiresAt.toISOString() },
    ipAddress: await getAdminIp(),
  });

  return {
    success: true,
    session: updatedSession || undefined,
  };
}

export const verifyOtpAction = verifyAdminSupportSession;

export interface GetActiveSupportSessionInput {
  householdId: string;
  memberId?: string | null;
}

/**
 * Retrieve the active, unexpired support session for a household or member.
 */
export async function getActiveSupportSessionAction(
  arg1: GetActiveSupportSessionInput | string,
  arg2?: string | null
): Promise<{ success: boolean; error?: string; session: AdminSupportSession | null }> {
  // 1. Enforce admin role
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return { success: false, error: "Unauthorized: Admin privileges required.", session: null };
  }

  let householdId: string;
  let memberId: string | null | undefined;
  if (typeof arg1 === "object" && arg1 !== null) {
    householdId = arg1.householdId;
    memberId = arg1.memberId;
  } else {
    householdId = arg1;
    memberId = arg2;
  }

  if (!householdId) {
    return { success: false, error: "Household ID is required.", session: null };
  }

  const active = await db.getActiveSupportSession(householdId, memberId || undefined);
  if (active && active.expiresAt && new Date(active.expiresAt).getTime() <= Date.now()) {
    await db.updateSupportSessionStatus(active.id, "expired");
    return { success: true, session: null };
  }

  return { success: true, session: active };
}

export const getActiveSupportSession = getActiveSupportSessionAction;

/**
 * Retrieve all active support sessions for the admin moderation dashboard.
 */
export async function getAllActiveSupportSessionsAction(): Promise<{
  success: boolean;
  error?: string;
  sessions: AdminSupportSession[];
}> {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return { success: false, error: "Unauthorized: Admin privileges required.", sessions: [] };
  }

  const sessions = await db.getAllActiveSupportSessions();
  return { success: true, sessions: sessions || [] };
}

export const getAllActiveSupportSessions = getAllActiveSupportSessionsAction;

export interface AdminCorrectMemberDetailsInput {
  sessionId: string;
  memberId: string;
  updates: Record<string, any>;
  reason?: string;
}

export interface AdminCorrectMemberDetailsResult {
  success: boolean;
  error?: string;
  message?: string;
  changes?: Record<string, { old: any; new: any }>;
}

/**
 * Correct member or household details within an active, authorized support session.
 * Computes exact field diffs, performs updates, and writes immutable audit logs.
 */
export async function adminCorrectMemberDetailsAction(
  arg1: AdminCorrectMemberDetailsInput | string,
  arg2?: string,
  arg3?: Record<string, any>,
  arg4?: string
): Promise<AdminCorrectMemberDetailsResult> {
  // 1. Enforce admin role
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return { success: false, error: "Unauthorized: Admin privileges required." };
  }

  let sessionId: string;
  let memberId: string;
  let rawUpdates: Record<string, any>;
  let reason: string | undefined;

  if (typeof arg1 === "object" && arg1 !== null && "sessionId" in arg1 && "memberId" in arg1 && "updates" in arg1) {
    sessionId = arg1.sessionId;
    memberId = arg1.memberId;
    rawUpdates = arg1.updates || {};
    reason = arg1.reason;
  } else {
    sessionId = arg1 as string;
    memberId = arg2!;
    rawUpdates = arg3 || {};
    reason = arg4;
  }

  if (!sessionId || !memberId) {
    return { success: false, error: "Session ID and Member ID are required." };
  }

  // 2. Validate session is currently active and unexpired (expiresAt > new Date())
  const supportSession = await db.getSupportSessionById(sessionId);
  if (!supportSession) {
    return { success: false, error: "Support session not found." };
  }

  if (supportSession.status !== "active") {
    return { success: false, error: `Support session is not active (current status: ${supportSession.status}).` };
  }

  if (!supportSession.expiresAt || new Date(supportSession.expiresAt).getTime() <= Date.now()) {
    await db.updateSupportSessionStatus(sessionId, "expired");
    return { success: false, error: "Support session has expired. Modifications are no longer permitted." };
  }

  if (supportSession.memberId && supportSession.memberId !== memberId) {
    return { success: false, error: "Support session is scoped to a different member." };
  }

  // 3. Fetch current member & household record
  const currentMember = await db.getMemberById(memberId);
  if (!currentMember) {
    return { success: false, error: "Member not found." };
  }

  const householdId = String(currentMember.householdId || supportSession.householdId);
  const currentHousehold = await db.getHouseholdById(householdId);

  // 4. Validate inputs
  const updates: Record<string, any> = { ...rawUpdates };

  // Full name: length >= 2
  if (updates.fullName !== undefined) {
    if (typeof updates.fullName !== "string" || updates.fullName.trim().length < 2) {
      return { success: false, error: "Full name must be at least 2 characters." };
    }
    updates.fullName = updates.fullName.trim();
  }

  // Father name: length >= 2 if provided
  if (updates.fatherName !== undefined && updates.fatherName !== null && updates.fatherName !== "") {
    if (typeof updates.fatherName !== "string" || updates.fatherName.trim().length < 2) {
      return { success: false, error: "Father's name must be at least 2 characters." };
    }
    updates.fatherName = updates.fatherName.trim();
  }

  // DOB: date or null / 'Not specified'
  if (updates.dob !== undefined && updates.dob !== null && updates.dob !== "" && updates.dob !== "Not specified") {
    const parsedDob = new Date(updates.dob);
    if (isNaN(parsedDob.getTime()) || parsedDob.getTime() > Date.now()) {
      return { success: false, error: "Invalid date of birth." };
    }
    updates.dob = parsedDob.toISOString().split("T")[0];
  } else if (updates.dob === "" || updates.dob === "Not specified") {
    updates.dob = null;
  }

  // Gender: Male | Female | Other
  if (updates.gender !== undefined && updates.gender !== null && updates.gender !== "") {
    const gLower = String(updates.gender).trim().toLowerCase();
    if (gLower === "male") updates.gender = "Male";
    else if (gLower === "female") updates.gender = "Female";
    else if (gLower === "other") updates.gender = "Other";
    else return { success: false, error: "Gender must be Male, Female, or Other." };
  }

  // Marital Status: valid marital status
  if (updates.maritalStatus !== undefined && updates.maritalStatus !== null && updates.maritalStatus !== "") {
    const validMarital = ["married", "unmarried", "single", "widowed", "divorced"];
    const mLower = String(updates.maritalStatus).trim().toLowerCase();
    if (!validMarital.includes(mLower)) {
      return { success: false, error: "Invalid marital status." };
    }
    updates.maritalStatus = mLower.charAt(0).toUpperCase() + mLower.slice(1);
  }

  // Gotra: valid gotra from src/data/gotras.ts
  if (updates.gotra !== undefined && updates.gotra !== null && updates.gotra !== "") {
    const gTrim = String(updates.gotra).trim();
    const matched = gotras.find(g => g.name.toLowerCase() === gTrim.toLowerCase() || g.devanagari === gTrim);
    if (!matched) {
      return { success: false, error: `Invalid gotra: "${updates.gotra}". Must be one of the 18 recognized Gotras.` };
    }
    updates.gotra = matched.name;
  }

  // Native Place: length >= 2
  if (updates.nativePlace !== undefined && updates.nativePlace !== null && updates.nativePlace !== "") {
    if (typeof updates.nativePlace !== "string" || updates.nativePlace.trim().length < 2) {
      return { success: false, error: "Native place must be at least 2 characters." };
    }
    updates.nativePlace = updates.nativePlace.trim();
  }

  // Relation to head: valid relations
  if (updates.relationToHead !== undefined && updates.relationToHead !== null && updates.relationToHead !== "") {
    const validRelations = ["self", "spouse", "son", "daughter", "parent", "other"];
    const rLower = String(updates.relationToHead).trim().toLowerCase();
    if (!validRelations.includes(rLower)) {
      return { success: false, error: "Invalid relation to head." };
    }
    updates.relationToHead = rLower;
  }

  // Reason
  const cleanReason = (reason || supportSession.reason)?.trim();
  if (!cleanReason) {
    return { success: false, error: "A reason for this correction is required for the audit log." };
  }

  // 5. Build exact diff { [field]: { old, new } }
  const changes: Record<string, { old: any; new: any }> = {};
  const memberUpdates: Record<string, any> = {};
  const householdUpdates: Record<string, any> = {};

  const memberFieldKeys = [
    "fullName",
    "fatherName",
    "dob",
    "gender",
    "maritalStatus",
    "relationToHead",
    "currentCity",
    "currentCountry",
    "profession",
    "professionTitle",
    "professionDescription",
    "companyName",
    "anniversaryDate",
    "bio",
    "photoUrl",
    "phone",
    "email",
    "postalCode",
    "state",
    "fullAddress",
  ];

  for (const key of memberFieldKeys) {
    if (key in updates && updates[key] !== undefined) {
      const oldVal = (currentMember as any)[key] ?? null;
      const newVal = updates[key] ?? null;
      const oldNorm = oldVal === "" ? null : oldVal;
      const newNorm = newVal === "" ? null : newVal;
      if (String(oldNorm ?? "") !== String(newNorm ?? "")) {
        changes[key] = { old: oldVal, new: newVal };
        memberUpdates[key] = newVal;
      }
    }
  }

  if ("gotra" in updates && updates.gotra !== undefined) {
    const oldGotra = currentHousehold?.gotra ?? null;
    const newGotra = updates.gotra ?? null;
    if (String(oldGotra ?? "") !== String(newGotra ?? "")) {
      changes.gotra = { old: oldGotra, new: newGotra };
      householdUpdates.gotra = newGotra;
    }
  }

  if ("nativePlace" in updates && updates.nativePlace !== undefined) {
    const oldNativePlace = currentHousehold?.nativePlace ?? null;
    const newNativePlace = updates.nativePlace ?? null;
    if (String(oldNativePlace ?? "") !== String(newNativePlace ?? "")) {
      changes.nativePlace = { old: oldNativePlace, new: newNativePlace };
      householdUpdates.nativePlace = newNativePlace;
    }
  }

  // 6. Execute updates
  if (Object.keys(memberUpdates).length > 0) {
    await db.updateMemberProfile(memberId, memberUpdates);
  }
  if (Object.keys(householdUpdates).length > 0) {
    await db.updateHouseholdProfile(householdId, householdUpdates);
  }

  // 7. Record audit log
  if (Object.keys(changes).length > 0) {
    await db.recordSupportAuditLog({
      sessionId,
      adminId: session.userId || session.contact || "admin",
      householdId,
      memberId,
      changes,
      reason: cleanReason,
    });
  }

  return {
    success: true,
    message: "Member details corrected and audit log recorded.",
    changes,
  };
}

export const adminCorrectMemberDetails = adminCorrectMemberDetailsAction;

export interface RevokeAdminSupportSessionInput {
  sessionId: string;
}

/**
 * Revoke an active support session.
 * Accessible to admins or affected household members.
 */
export async function revokeAdminSupportSessionAction(
  arg: RevokeAdminSupportSessionInput | string
): Promise<{ success: boolean; error?: string; message?: string }> {
  // 1. Enforce admin role or affected household member session
  const session = await getSession();
  if (!session) {
    return { success: false, error: "Unauthorized: Active session required." };
  }

  const sessionId = typeof arg === "object" && arg !== null ? arg.sessionId : arg;
  if (!sessionId) {
    return { success: false, error: "Session ID is required." };
  }

  const supportSession = await db.getSupportSessionById(sessionId);
  if (!supportSession) {
    return { success: false, error: "Support session not found." };
  }

  const isAdmin = session.role === "admin";
  const isHouseholdMember =
    session.userId === supportSession.householdId ||
    session.contact === supportSession.householdId;

  if (!isAdmin && !isHouseholdMember) {
    return { success: false, error: "Unauthorized: You do not have permission to revoke this session." };
  }

  // 2. Update session status to 'revoked' and expiresAt: new Date()
  const now = new Date();
  await db.updateSupportSessionStatus(sessionId, "revoked", {
    expiresAt: now,
  });

  await db.recordPlatformAuditLog({
    adminId: session.userId || "admin",
    adminContact: session.contact || "admin",
    action: "SUPPORT_SESSION_REVOKED",
    category: "SUPPORT_SESSION",
    severity: "WARN",
    targetType: "support_session",
    targetId: sessionId,
    details: { reason: "Session explicitly revoked" },
    ipAddress: await getAdminIp(),
  });

  return { success: true, message: "Support session revoked successfully." };
}

export const revokeAdminSupportSession = revokeAdminSupportSessionAction;

export interface GetSupportAuditLogsInput {
  sessionId: string;
}

/**
 * Fetch immutable audit logs for a given support session.
 */
export async function getSupportAuditLogsAction(
  arg: GetSupportAuditLogsInput | string
): Promise<{ success: boolean; error?: string; logs: AdminSupportAuditLog[] }> {
  // 1. Enforce admin role
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return { success: false, error: "Unauthorized: Admin privileges required.", logs: [] };
  }

  const sessionId = typeof arg === "object" && arg !== null ? arg.sessionId : arg;
  if (!sessionId) {
    return { success: false, error: "Session ID is required.", logs: [] };
  }

  const logs = await db.getSupportAuditLogsBySession(sessionId);
  return { success: true, logs: logs || [] };
}

export const getSupportAuditLogs = getSupportAuditLogsAction;

export const requestAdminSupportSessionAction = requestAdminSupportSession;
export const verifyAdminSupportSessionAction = verifyAdminSupportSession;
