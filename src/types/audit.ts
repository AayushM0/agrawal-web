export type AuditCategory =
  | 'MODERATION'
  | 'SUPPORT_SESSION'
  | 'IDENTITY_ACCESS'
  | 'BUSINESS'
  | 'CAREER_JOB'
  | 'MATRIMONY'
  | 'COMMUNICATION'
  | 'SYSTEM';

export type AuditSeverity = 'INFO' | 'WARN' | 'CRITICAL';

export type AuditAction =
  // Moderation
  | 'APPROVE_HOUSEHOLD'
  | 'APPROVE_ALL_HOUSEHOLDS'
  | 'REJECT_HOUSEHOLD'
  | 'RESEND_HOUSEHOLD_PASSES'
  | 'PASS_GENERATION_WARNING'
  | 'RETRY_FAILED_EMAILS'
  | 'DRAIN_EMAIL_QUEUE'
  // Support Sessions
  | 'SUPPORT_SESSION_REQUESTED'
  | 'SUPPORT_SESSION_AUTHORIZED'
  | 'SUPPORT_SESSION_REVOKED'
  | 'MEMBER_DETAILS_CORRECTED'
  // Identity & Auth
  | 'ADMIN_LOGIN_SUCCESS'
  | 'ADMIN_LOGIN_FAILED'
  | 'ADMIN_LOGOUT'
  | 'ADMIN_LOCKOUT_TRIGGERED'
  // Business Directory
  | 'APPROVE_BUSINESS'
  | 'REJECT_BUSINESS'
  | 'RESEND_BUSINESS_CERTIFICATE'
  | 'ADMIN_CREATE_BUSINESS_PROFILE'
  | 'BUSINESS_STATUS_TOGGLED'
  // Career & Jobs
  | 'ADMIN_CREATE_CAREER_PROFILE'
  | 'CAREER_PROFILE_STATUS_TOGGLED'
  | 'JOB_POSTING_CREATED'
  | 'JOB_POSTING_STATUS_CHANGED'
  // Matrimony
  | 'ADMIN_CREATE_MATRIMONY_PROFILE'
  | 'MATRIMONY_PROFILE_STATUS_CHANGED'
  // Communication & Support
  | 'RESOLVE_REPORT_DISMISS'
  | 'RESOLVE_REPORT_WARN'
  | 'RESOLVE_REPORT_SUSPEND_CHAT'
  | 'UPDATE_INQUIRY_STATUS';

export interface AuditTrailItem {
  id: string;
  timestamp: string;
  adminId: string;
  adminContact: string;
  action: string;
  category: AuditCategory;
  severity: AuditSeverity;
  targetType: string;
  targetId: string;
  targetName?: string;
  details: Record<string, any>;
  ipAddress?: string | null;
  checksum?: string | null;
  sourceTable: 'admin_audit_logs' | 'admin_support_audit_logs';
}

export interface GetAuditTrailInput {
  page?: number;
  limit?: number;
  category?: AuditCategory | 'ALL';
  severity?: AuditSeverity | 'ALL';
  adminId?: string;
  targetType?: string;
  targetId?: string;
  dateFrom?: string; // ISO 8601 string or YYYY-MM-DD
  dateTo?: string;   // ISO 8601 string or YYYY-MM-DD
  search?: string;
}

export interface AuditTrailPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AuditTrailStats {
  totalLogs: number;
  logsToday: number;
  criticalEventsCount: number;
  activeAdminsCount: number;
  categoryBreakdown: Record<string, number>;
}

export interface AuditTrailResponse {
  success: boolean;
  logs: AuditTrailItem[];
  pagination: AuditTrailPagination;
  stats?: AuditTrailStats;
  error?: string;
}

export interface RecordPlatformAuditLogInput {
  adminId: string;
  adminContact: string;
  action: AuditAction | string;
  category?: AuditCategory;
  severity?: AuditSeverity;
  targetType: string;
  targetId: string;
  details?: Record<string, any>;
  ipAddress?: string | null;
}
