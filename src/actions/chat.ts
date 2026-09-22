'use server';

import { getSession } from "@/actions/auth";
import { db } from "@/lib/db";
import { scanForFraud } from "@/lib/anti-fraud";
import { sendMessageRequestNotificationEmail } from "@/lib/email";

let cachedPusher: any = null;
async function getPusherServer() {
  if (cachedPusher) return cachedPusher;
  if (!process.env.PUSHER_APP_ID || !process.env.NEXT_PUBLIC_PUSHER_APP_KEY || !process.env.PUSHER_SECRET) {
    return null;
  }
  const PusherServer = (await import("pusher")).default;
  cachedPusher = new PusherServer({
    appId: process.env.PUSHER_APP_ID,
    key: process.env.NEXT_PUBLIC_PUSHER_APP_KEY,
    secret: process.env.PUSHER_SECRET,
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "us2",
    useTLS: true,
  });
  return cachedPusher;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function resolveEffectiveMemberId(session: any): Promise<string | null> {
  if (!session) return null;
  if (session.userId && UUID_REGEX.test(session.userId)) {
    return session.userId;
  }
  // Self-healing fallback: If legacy session token had non-UUID string, resolve from DB
  if (session.contact) {
    const member = await db.getMemberByContact(session.contact);
    if (member?.id && UUID_REGEX.test(member.id)) {
      return member.id;
    }
  }
  return null;
}

/**
 * Send a message or initiate a two-stage message request.
 */
export async function sendMessage(params: {
  recipientMemberId: string;
  messageBody?: string;          // optional — attachment-only messages have no text
  conversationId?: string;
  attachmentUrl?: string;        // storage path in chat-attachments bucket
  attachmentType?: string;       // 'image' | 'video' | 'pdf' | 'ppt'
  attachmentName?: string;
  attachmentSize?: number;
}): Promise<{ success: boolean; message?: any; conversationId?: string; error?: string }> {
  try {
    const session = await getSession();
    const senderMemberId = await resolveEffectiveMemberId(session);
    if (!senderMemberId) {
      return { success: false, error: "Please log in again to send messages." };
    }

    if (!UUID_REGEX.test(params.recipientMemberId)) {
      return { success: false, error: "Invalid recipient member identifier." };
    }

    if (senderMemberId === params.recipientMemberId) {
      return { success: false, error: "You cannot message yourself." };
    }

    const trimmedBody = params.messageBody?.trim() || null;
    if (!trimmedBody && !params.attachmentUrl) {
      return { success: false, error: "Message cannot be empty." };
    }

    if (trimmedBody && trimmedBody.length > 2000) {
      return { success: false, error: "Message exceeds maximum length of 2000 characters." };
    }

    // Get or Create Conversation
    let conversation: any;
    if (params.conversationId) {
      conversation = await db.getConversationById(params.conversationId);
      if (!conversation) {
        return { success: false, error: "Conversation not found." };
      }
    } else {
      conversation = await db.getOrCreateConversation(senderMemberId, params.recipientMemberId);
    }

    // Verify participant authorization
    const isInitiator = String(conversation.initiator_id) === String(senderMemberId);
    const isRecipient = String(conversation.recipient_id) === String(senderMemberId);
    if (!isInitiator && !isRecipient) {
      return { success: false, error: "Unauthorized access to this conversation." };
    }

    // Check conversation status
    if (conversation.status === "blocked") {
      return { success: false, error: "This conversation has been blocked." };
    }
    if (conversation.status === "declined" && isInitiator) {
      return { success: false, error: "Your message request was declined by the recipient." };
    }

    // Two-stage request guard: If pending and sender is initiator, check if already sent initial note
    let isFirstRequestTurn = false;
    if (conversation.status === "pending" && isInitiator) {
      const existingMessages = await db.getMessagesByConversation(conversation.id, 5);
      if (existingMessages.length > 0) {
        return {
          success: false,
          error: "Message request pending: Please wait for the recipient to accept before sending further messages.",
        };
      }
      isFirstRequestTurn = true;
    }

    // Check rate limits via database (serverless-safe & multi-instance persistent)
    const isNew = !params.conversationId && conversation.status === "pending";
    const rateCheck = await db.checkChatRateLimits(senderMemberId, isNew);
    if (!rateCheck.allowed) {
      return { success: false, error: rateCheck.error };
    }

    // Anti-Fraud & Scam Heuristics (only scan text body if present)
    const fraudScan = trimmedBody ? scanForFraud(trimmedBody) : { isFlagged: false, reason: null };

    const actualRecipientId = isInitiator ? conversation.recipient_id : conversation.initiator_id;

    // Insert Message
    const msg = await db.insertMessage({
      conversationId: conversation.id,
      senderId: senderMemberId,
      recipientId: actualRecipientId,
      messageBody: trimmedBody,
      isFlagged: fraudScan.isFlagged,
      flagReason: fraudScan.reason || undefined,
      attachmentUrl: params.attachmentUrl,
      attachmentType: params.attachmentType,
      attachmentName: params.attachmentName,
      attachmentSize: params.attachmentSize,
    });

    // 1. If this is the first turn of a connection request, trigger email notification asynchronously
    if (isFirstRequestTurn) {
      (async () => {
        try {
          const [recipientMember, senderMember] = await Promise.all([
            db.getMemberById(actualRecipientId),
            db.getMemberById(senderMemberId),
          ]);

          if (recipientMember?.email) {
            await sendMessageRequestNotificationEmail({
              recipientEmail: recipientMember.email,
              recipientName: recipientMember.fullName,
              senderName: senderMember?.fullName || "A Community Member",
              senderGotra: senderMember?.gotra || null,
              senderCity: senderMember?.currentCity || null,
              messagePreview: (trimmedBody ?? "").slice(0, 250),
              conversationId: conversation.id,
            });
          }
        } catch (emailErr) {
          console.error("Async email dispatch failed (non-fatal):", emailErr);
        }
      })();
    }

    // Fire Pusher real-time events (graceful: never block the return if Pusher fails)
    const pusher = await getPusherServer();
    if (pusher) {
      try {

        // 1. Trigger the active chat room so both participants see the new message immediately
        await pusher.trigger(`private-chat-room-${conversation.id}`, "new-message", {
          id: msg.id,
          conversationId: msg.conversation_id,
          senderId: msg.sender_id,
          recipientId: msg.recipient_id,
          messageBody: msg.message_body,
          isFlagged: msg.is_flagged,
          flagReason: msg.flag_reason ?? null,
          readAt: msg.read_at ?? null,
          createdAt: msg.created_at,
        });

        // 2. Fetch sender profile to include in real-time user notification
        const senderProfile = await db.getMemberById(senderMemberId).catch(() => null);

        // 3. Notify the recipient's personal user channel so pop-up toasts & unread counts update instantly
        await pusher.trigger(`private-user-${actualRecipientId}`, "incoming-message", {
          conversationId: conversation.id,
          senderId: senderMemberId,
          senderName: senderProfile?.fullName || "A Community Member",
          senderGotra: senderProfile?.gotra || null,
          messagePreview: (trimmedBody ?? "").slice(0, 120),
          isRequest: isFirstRequestTurn,
        });
      } catch (pusherErr) {
        console.error("Pusher trigger failed (non-fatal):", pusherErr);
      }
    }

    return {
      success: true,
      message: msg,
      conversationId: conversation.id,
    };
  } catch (err: any) {
    console.error("sendMessage error:", err);
    return { success: false, error: "Failed to send message. Please try again." };
  }
}


/**
 * Get all conversations for the authenticated member (split into Active and Requests).
 */
export async function getConversations(): Promise<{
  success: boolean;
  active?: any[];
  requests?: any[];
  error?: string;
}> {
  try {
    const session = await getSession();
    const memberId = await resolveEffectiveMemberId(session);
    if (!memberId) {
      return { success: false, error: "Authentication required." };
    }

    const { active, requests } = await db.getConversationsForMember(memberId);
    return { success: true, active, requests };
  } catch (err: any) {
    console.error("getConversations error:", err);
    return { success: false, error: "Failed to fetch conversations. Please try again." };
  }
}

/**
 * Get message history for a specific conversation with strict IDOR verification.
 */
export async function getMessages(conversationId: string, limit = 50, offset = 0): Promise<{
  success: boolean;
  messages?: any[];
  conversation?: any;
  error?: string;
}> {
  try {
    const session = await getSession();
    const memberId = await resolveEffectiveMemberId(session);
    if (!memberId) {
      return { success: false, error: "Authentication required." };
    }

    const conversation = await db.getConversationById(conversationId);
    if (!conversation) {
      return { success: false, error: "Conversation not found." };
    }

    const isParticipant =
      String(conversation.initiator_id) === String(memberId) ||
      String(conversation.recipient_id) === String(memberId);

    if (!isParticipant && session?.role !== "admin") {
      return { success: false, error: "Unauthorized: You are not a participant in this conversation." };
    }

    // Fetch messages
    const messages = await db.getMessagesByConversation(conversationId, limit, offset);

    // Auto-mark unread incoming messages as read
    await db.markMessagesAsRead(conversationId, memberId);

    return { success: true, messages, conversation };
  } catch (err: any) {
    console.error("getMessages error:", err);
    return { success: false, error: "Failed to fetch messages. Please try again." };
  }
}

/**
 * Accept, decline, or block an incoming message request.
 */
export async function respondToRequest(params: {
  conversationId: string;
  action: "accept" | "decline" | "block";
}): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getSession();
    const memberId = await resolveEffectiveMemberId(session);
    if (!memberId) {
      return { success: false, error: "Authentication required." };
    }

    const conversation = await db.getConversationById(params.conversationId);
    if (!conversation) {
      return { success: false, error: "Conversation not found." };
    }

    // Only the recipient can accept or decline a request
    if (String(conversation.recipient_id) !== String(memberId)) {
      return { success: false, error: "Only the recipient of a message request can respond to it." };
    }

    const newStatus =
      params.action === "accept"
        ? "accepted"
        : params.action === "decline"
        ? "declined"
        : "blocked";

    await db.updateConversationStatus(params.conversationId, newStatus);

    // Fire Pusher events so both sides see the status change in real-time
    const pusher = await getPusherServer();
    if (pusher) {
      try {

        // Notify the active chat room that conversation status changed
        await pusher.trigger(`private-chat-room-${params.conversationId}`, "conversation-updated", {
          id: params.conversationId,
          status: newStatus,
        });

        // Notify the initiator (other party) via their personal channel so their sidebar updates
        const initiatorId = conversation.initiator_id;
        await pusher.trigger(`private-user-${initiatorId}`, "incoming-message", {
          conversationId: params.conversationId,
          status: newStatus,
        });
      } catch (pusherErr) {
        console.error("Pusher respondToRequest trigger failed (non-fatal):", pusherErr);
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error("respondToRequest error:", err);
    return { success: false, error: "Failed to update request. Please try again." };
  }
}


/**
 * Report an offensive, fraudulent, or abusive conversation to platform administrators.
 */
export async function reportConversation(params: {
  conversationId: string;
  reason: "financial_fraud" | "harassment" | "spam" | "impersonation" | "other";
  details?: string;
  offendingMessageId?: string;
}): Promise<{ success: boolean; reportId?: string; error?: string }> {
  try {
    const session = await getSession();
    const memberId = await resolveEffectiveMemberId(session);
    if (!memberId) {
      return { success: false, error: "Authentication required." };
    }

    const conversation = await db.getConversationById(params.conversationId);
    if (!conversation) {
      return { success: false, error: "Conversation not found." };
    }

    const isParticipant =
      String(conversation.initiator_id) === String(memberId) ||
      String(conversation.recipient_id) === String(memberId);

    if (!isParticipant) {
      return { success: false, error: "You can only report conversations you participate in." };
    }

    const reportedMemberId =
      String(conversation.initiator_id) === String(memberId)
        ? conversation.recipient_id
        : conversation.initiator_id;

    // Capture recent thread snapshot
    const threadSnapshot = await db.getMessagesByConversation(params.conversationId, 20);

    const report = await db.createMessageReport({
      conversationId: params.conversationId,
      reporterId: memberId,
      reportedMemberId,
      offendingMessageId: params.offendingMessageId,
      reason: params.reason,
      details: params.details,
      snapshotData: threadSnapshot,
    });

    return { success: true, reportId: report.id };
  } catch (err: any) {
    console.error("reportConversation error:", err);
    return { success: false, error: "Failed to submit report. Please try again." };
  }
}

/**
 * Generate a fresh signed URL for a private chat attachment stored in Supabase Storage.
 * Called client-side when rendering messages that contain attachments.
 */
export async function getAttachmentSignedUrl(
  storagePath: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const session = await getSession();
    const memberId = await resolveEffectiveMemberId(session);
    if (!memberId) {
      return { success: false, error: "Authentication required." };
    }

    if (!storagePath || typeof storagePath !== "string") {
      return { success: false, error: "Invalid storage path." };
    }

    // IDOR guard: verify caller is a participant of the conversation this file belongs to.
    // Storage paths are structured as "{conversationId}/{timestamp}-{filename}".
    const conversationId = storagePath.split("/")[0];
    if (!UUID_REGEX.test(conversationId)) {
      return { success: false, error: "Invalid storage path format." };
    }
    const conversation = await db.getConversationById(conversationId);
    if (!conversation) {
      return { success: false, error: "Conversation not found." };
    }
    const isParticipant =
      String(conversation.initiatorId ?? conversation.initiator_id) === memberId ||
      String(conversation.recipientId ?? conversation.recipient_id) === memberId;
    if (!isParticipant && session?.role !== "admin") {
      return { success: false, error: "Access denied." };
    }

    const { getChatAttachmentSignedUrl } = await import("@/lib/storage");
    const url = await getChatAttachmentSignedUrl(storagePath, 3600);

    if (!url) {
      return { success: false, error: "Could not generate signed URL." };
    }

    return { success: true, url };
  } catch (err: any) {
    console.error("getAttachmentSignedUrl error:", err);
    return { success: false, error: "Failed to load attachment. Please try again." };
  }
}
