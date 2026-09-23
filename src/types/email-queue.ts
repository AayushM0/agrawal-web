export type EmailQueueStatus = "pending" | "processing" | "sent" | "failed";

export interface EmailQueueItem {
  id: string;
  recipientEmail: string;
  recipientName?: string | null;
  subject: string;
  htmlBody: string;
  textBody?: string | null;
  attachments?: Array<{ filename: string; content: string }> | null;
  metadata?: Record<string, any>;
  status: EmailQueueStatus;
  attempts: number;
  maxAttempts: number;
  lastError?: string | null;
  resendId?: string | null;
  scheduledFor: string;
  sentAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EnqueueEmailInput {
  recipientEmail: string;
  recipientName?: string | null;
  subject: string;
  htmlBody: string;
  textBody?: string;
  attachments?: Array<{ filename: string; content: string }>;
  metadata?: Record<string, any>;
  scheduledFor?: Date;
}

export interface EmailQueueStats {
  pending: number;
  processing: number;
  sent: number;
  failed: number;
  total: number;
}
