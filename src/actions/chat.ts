'use server';

import { getSession } from "@/actions/auth";
import { db } from "@/lib/db";
import { scanForFraud } from "@/lib/anti-fraud";

// In-Memory Rate Limiting: Max 10 new conversations per day, 60 messages per hour
const chatRateLimits = new Map<string, { conversationsToday: number; messagesThisHour: number; lastHourReset: number; lastDayReset: number }>();

function checkRateLimit(memberId: string, isNewConversation: boolean): { allowed: boolean; error?: string } {
  const now = Date.now();
  const entry = chatRateLimits.get(memberId) || {
    conversationsToday: 0,
    messagesThisHour: 0,
    lastHourReset: now,
    lastDayReset: now,
  };

  // Reset hourly window
  if (now - entry.lastHourReset > 60 * 60 * 1000) {
    entry.messagesThisHour = 0;
    entry.lastHourReset = now;
  }

  // Reset daily window
  if (now - entry.lastDayReset > 24 * 60 * 60 * 1000) {
    entry.conversationsToday = 0;
    entry.lastDayReset = now;
  }

  if (isNewConversation && entry.conversationsToday >= 10) {
    return { allowed: false, error: "Daily limit reached: Maximum 10 new message requests allowed per day." };
  }

  if (entry.messagesThisHour >= 60) {
    return { allowed: false, error: "Rate limit exceeded: Maximum 60 messages allowed per hour." };
  }

  if (isNewConversation) entry.conversationsToday++;
  entry.messagesThisHour++;
  chatRateLimits.set(memberId, entry);

  return { allowed: true };
}

/**
 * Send a message or initiate a two-stage message request.
 */
export async function sendMessage(params: {
  recipientMemberId: string;
  messageBody: string;
  conversationId?: string;
}): Promise<{ success: boolean; message?: any; conversationId?: string; error?: string }> {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return { success: false, error: "You must be signed in to send messages." };
    }

    const senderMemberId = session.userId;
    if (senderMemberId === params.recipientMemberId) {
      return { success: false, error: "You cannot message yourself." };
    }

    const trimmedBody = params.messageBody?.trim();
    if (!trimmedBody) {
      return { success: false, error: "Message cannot be empty." };
    }

    if (trimmedBody.length > 2000) {
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
    if (conversation.status === "pending" && isInitiator) {
      const existingMessages = await db.getMessagesByConversation(conversation.id, 5);
      if (existingMessages.length > 0) {
        return {
          success: false,
          error: "Message request pending: Please wait for the recipient to accept before sending further messages.",
        };
      }
    }

    // Check rate limits
    const isNew = !params.conversationId && conversation.status === "pending";
    const rateCheck = checkRateLimit(senderMemberId, isNew);
    if (!rateCheck.allowed) {
      return { success: false, error: rateCheck.error };
    }

    // Anti-Fraud & Scam Heuristics
    const fraudScan = scanForFraud(trimmedBody);

    const actualRecipientId = isInitiator ? conversation.recipient_id : conversation.initiator_id;

    // Insert Message
    const msg = await db.insertMessage({
      conversationId: conversation.id,
      senderId: senderMemberId,
      recipientId: actualRecipientId,
      messageBody: trimmedBody,
      isFlagged: fraudScan.isFlagged,
      flagReason: fraudScan.reason || undefined,
    });

    return {
      success: true,
      message: msg,
      conversationId: conversation.id,
    };
  } catch (err: any) {
    console.error("sendMessage error:", err);
    return { success: false, error: err.message || "Failed to send message." };
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
    if (!session || !session.userId) {
      return { success: false, error: "Authentication required." };
    }

    const { active, requests } = await db.getConversationsForMember(session.userId);
    return { success: true, active, requests };
  } catch (err: any) {
    console.error("getConversations error:", err);
    return { success: false, error: err.message || "Failed to fetch conversations." };
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
    if (!session || !session.userId) {
      return { success: false, error: "Authentication required." };
    }

    const conversation = await db.getConversationById(conversationId);
    if (!conversation) {
      return { success: false, error: "Conversation not found." };
    }

    const isParticipant =
      String(conversation.initiator_id) === String(session.userId) ||
      String(conversation.recipient_id) === String(session.userId);

    if (!isParticipant && session.role !== "admin") {
      return { success: false, error: "Unauthorized: You are not a participant in this conversation." };
    }

    // Fetch messages
    const messages = await db.getMessagesByConversation(conversationId, limit, offset);

    // Auto-mark unread incoming messages as read
    await db.markMessagesAsRead(conversationId, session.userId);

    return { success: true, messages, conversation };
  } catch (err: any) {
    console.error("getMessages error:", err);
    return { success: false, error: err.message || "Failed to fetch messages." };
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
    if (!session || !session.userId) {
      return { success: false, error: "Authentication required." };
    }

    const conversation = await db.getConversationById(params.conversationId);
    if (!conversation) {
      return { success: false, error: "Conversation not found." };
    }

    // Only the recipient can accept or decline a request
    if (String(conversation.recipient_id) !== String(session.userId)) {
      return { success: false, error: "Only the recipient of a message request can respond to it." };
    }

    const newStatus =
      params.action === "accept"
        ? "accepted"
        : params.action === "decline"
        ? "declined"
        : "blocked";

    await db.updateConversationStatus(params.conversationId, newStatus);
    return { success: true };
  } catch (err: any) {
    console.error("respondToRequest error:", err);
    return { success: false, error: err.message || "Failed to update request." };
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
    if (!session || !session.userId) {
      return { success: false, error: "Authentication required." };
    }

    const conversation = await db.getConversationById(params.conversationId);
    if (!conversation) {
      return { success: false, error: "Conversation not found." };
    }

    const isParticipant =
      String(conversation.initiator_id) === String(session.userId) ||
      String(conversation.recipient_id) === String(session.userId);

    if (!isParticipant) {
      return { success: false, error: "You can only report conversations you participate in." };
    }

    const reportedMemberId =
      String(conversation.initiator_id) === String(session.userId)
        ? conversation.recipient_id
        : conversation.initiator_id;

    // Capture recent thread snapshot
    const threadSnapshot = await db.getMessagesByConversation(params.conversationId, 20);

    const report = await db.createMessageReport({
      conversationId: params.conversationId,
      reporterId: session.userId,
      reportedMemberId,
      offendingMessageId: params.offendingMessageId,
      reason: params.reason,
      details: params.details,
      snapshotData: threadSnapshot,
    });

    return { success: true, reportId: report.id };
  } catch (err: any) {
    console.error("reportConversation error:", err);
    return { success: false, error: err.message || "Failed to submit report." };
  }
}
