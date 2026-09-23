import { db } from "@/lib/db";
import { dispatchResendEmail } from "@/lib/email";
import type { EnqueueEmailInput } from "@/types/email-queue";

export interface DrainQueueResult {
  processed: number;
  succeeded: number;
  failed: number;
  remainingPending: number;
  errors: string[];
}

/**
 * Enqueue an outbound email into the durable PostgreSQL email_queue table.
 */
export async function enqueueEmail(input: EnqueueEmailInput): Promise<{ success: boolean; queueId?: string; error?: string }> {
  try {
    const cleanEmail = input.recipientEmail?.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@") || cleanEmail.length < 5) {
      return { success: false, error: "Invalid recipient email address" };
    }

    const queueId = await db.enqueueEmail({
      ...input,
      recipientEmail: cleanEmail,
    });

    if (!queueId) {
      return { success: false, error: "Failed to persist email in database queue" };
    }

    return { success: true, queueId };
  } catch (err: any) {
    console.error("[EMAIL QUEUE] Enqueue error:", err);
    return { success: false, error: err?.message || "Failed to enqueue email" };
  }
}

/**
 * Paced queue drainer.
 * Processes items one-by-one from the database queue with rate-limit pacing (>=650ms).
 * Safe for serverless environments with a configurable timeout budget.
 */
export async function drainEmailQueue(options: {
  maxItems?: number;
  timeoutMs?: number;
} = {}): Promise<DrainQueueResult> {
  const maxItems = options.maxItems || 10;
  const timeoutMs = options.timeoutMs || 8000;
  const startTime = Date.now();

  const result: DrainQueueResult = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    remainingPending: 0,
    errors: [],
  };

  while (result.processed < maxItems) {
    // Check if approaching timeout budget
    if (Date.now() - startTime > timeoutMs) {
      break;
    }

    // Atomically claim next job via FOR UPDATE SKIP LOCKED
    const job = await db.claimNextEmailJob();
    if (!job) {
      // No more pending jobs currently ready
      break;
    }

    result.processed++;

    try {
      const dispatchRes = await dispatchResendEmail({
        to: job.recipientEmail,
        subject: job.subject,
        html: job.htmlBody,
        text: job.textBody || undefined,
        attachments: job.attachments || undefined,
      });

      if (dispatchRes.success && dispatchRes.messageId) {
        await db.markEmailSent(job.id, dispatchRes.messageId);
        result.succeeded++;
      } else {
        const isTerminal = dispatchRes.statusCode === 422 || dispatchRes.statusCode === 400;
        await db.markEmailFailed(job.id, dispatchRes.error || "Unknown Resend error", isTerminal);
        result.failed++;
        result.errors.push(`Job ${job.id} (${job.recipientEmail}): ${dispatchRes.error}`);
      }
    } catch (err: any) {
      await db.markEmailFailed(job.id, err?.message || "Unhandled dispatch failure", false);
      result.failed++;
      result.errors.push(`Job ${job.id} exception: ${err?.message || err}`);
    }
  }

  // Get current remaining pending count
  try {
    const stats = await db.getEmailQueueStats();
    result.remainingPending = stats.pending;
  } catch (_) {
    result.remainingPending = 0;
  }

  return result;
}
