export type SupportSessionStatus = "pending" | "active" | "expired" | "revoked";

export interface AdminSupportSession {
  id: string;
  adminId: string;
  householdId: string;
  memberId?: string | null;
  otpHash: string;
  otpExpiresAt: string;
  otpAttempts: number;
  status: SupportSessionStatus;
  authorizedAt?: string | null;
  expiresAt?: string | null;
  reason: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminSupportAuditLog {
  id: string;
  sessionId: string;
  adminId: string;
  householdId: string;
  memberId?: string | null;
  changes: Record<string, { old: any; new: any }>;
  reason: string;
  createdAt: string;
}

export interface CreateSupportSessionInput {
  adminId: string;
  householdId: string;
  memberId?: string | null;
  otpHash: string;
  otpExpiresAt: string | Date;
  reason: string;
  status?: SupportSessionStatus;
}

export interface UpdateSupportSessionInput {
  status?: SupportSessionStatus;
  authorizedAt?: string | Date | null;
  expiresAt?: string | Date | null;
  otpAttempts?: number;
}

export interface RecordSupportAuditLogInput {
  sessionId: string;
  adminId: string;
  householdId: string;
  memberId?: string | null;
  changes: Record<string, { old: any; new: any }>;
  reason: string;
}
