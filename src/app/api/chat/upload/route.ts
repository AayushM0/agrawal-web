import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/actions/auth";
import { db } from "@/lib/db";
import {
  uploadChatAttachment,
  ALLOWED_ATTACHMENT_MIME_TYPES,
  MAX_ATTACHMENT_BYTES,
} from "@/lib/storage";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/chat/upload
 *
 * Authenticates session, validates the conversation is accepted and the caller
 * is a participant, then uploads the file to the private chat-attachments bucket.
 *
 * Body: multipart/form-data with fields:
 *   - file: File
 *   - conversationId: string (UUID)
 *
 * Returns: { storagePath, attachmentType, attachmentName, attachmentSize }
 */
export async function POST(req: NextRequest) {
  try {
    // ── 1. Auth ───────────────────────────────────────────────────────────────
    const session = await getSession();
    if (!session?.userId || !UUID_REGEX.test(session.userId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const memberId = session.userId as string;

    // ── 2. Parse multipart form ────────────────────────────────────────────────
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json({ error: "Invalid multipart form data" }, { status: 400 });
    }

    const file = formData.get("file") as File | null;
    const conversationId = formData.get("conversationId") as string | null;

    if (!file || !conversationId) {
      return NextResponse.json({ error: "Missing file or conversationId" }, { status: 400 });
    }

    if (!UUID_REGEX.test(conversationId)) {
      return NextResponse.json({ error: "Invalid conversationId" }, { status: 400 });
    }

    // ── 3. Validate file type ──────────────────────────────────────────────────
    const mimeType = file.type?.toLowerCase() || "";
    if (!ALLOWED_ATTACHMENT_MIME_TYPES[mimeType]) {
      return NextResponse.json(
        { error: `File type '${mimeType}' is not allowed. Supported: images, videos, PDF, PPT.` },
        { status: 415 }
      );
    }

    // ── 4. Validate file size ──────────────────────────────────────────────────
    if (file.size > MAX_ATTACHMENT_BYTES) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_ATTACHMENT_BYTES / 1024 / 1024} MB.` },
        { status: 413 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json({ error: "File is empty" }, { status: 400 });
    }

    // ── 5. Verify conversation exists, is accepted, caller is a participant ────
    const conversation = await db.getConversationById(conversationId);
    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const isParticipant =
      conversation.initiator_id === memberId || conversation.recipient_id === memberId;
    if (!isParticipant) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (conversation.status !== "accepted") {
      return NextResponse.json(
        { error: "File sharing is only available in accepted conversations." },
        { status: 403 }
      );
    }

    // ── 6. Upload to Supabase Storage ─────────────────────────────────────────
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await uploadChatAttachment(buffer, file.name, mimeType, conversationId);

    if (!result) {
      return NextResponse.json(
        { error: "File upload failed. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json(result, { status: 200 });

  } catch (err: any) {
    console.error("[API /chat/upload] Unexpected error:", err?.message || err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
