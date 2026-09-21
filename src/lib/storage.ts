import { createClient, SupabaseClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

let cachedSupabaseClient: SupabaseClient | null = null;

/**
 * Initializes or returns cached Supabase client with service_role credentials
 */
function getSupabaseClient(): SupabaseClient | null {
  if (cachedSupabaseClient) return cachedSupabaseClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return null;
  }

  cachedSupabaseClient = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return cachedSupabaseClient;
}

export interface UploadPhotoOptions {
  bucket?: string;
  folder?: string;
  identifier?: string;
}

/**
 * Uploads a base64 data URL or binary Buffer to Supabase Storage.
 *
 * Invariant preservation:
 * - If the payload is already an HTTPS/HTTP URL, returns it as-is (idempotent).
 * - If Supabase credentials are not configured or cloud upload fails in local dev,
 *   falls back to saving in `public/uploads/` for seamless offline testing.
 */
export async function uploadMemberPhoto(
  payload?: string | Buffer | null,
  options: UploadPhotoOptions = {}
): Promise<string> {
  if (!payload) return "";

  // 1. Idempotency check: already a remote or hosted URL
  if (typeof payload === "string") {
    const trimmed = payload.trim();
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("/uploads/")) {
      return trimmed;
    }
  }

  const bucket = options.bucket || "member-photos";
  const folder = options.folder || "avatars";
  const identifier = options.identifier || "member";

  let buffer: Buffer;
  let contentType = "image/jpeg";
  let extension = "jpg";

  // 2. Parse Base64 Data URL
  if (typeof payload === "string") {
    const match = payload.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (match) {
      contentType = match[1].toLowerCase();
      if (contentType.includes("png")) extension = "png";
      else if (contentType.includes("webp")) extension = "webp";
      else extension = "jpg";
      buffer = Buffer.from(match[2], "base64");
    } else {
      // Not a recognized base64 data URL, preserve as-is
      return payload;
    }
  } else if (Buffer.isBuffer(payload)) {
    buffer = payload;
  } else {
    return "";
  }

  const cleanId = identifier.replace(/[^a-zA-Z0-9_-]/g, "_");
  const fileName = `${folder}/${cleanId}-${Date.now()}.${extension}`;

  // 3. Attempt Supabase Storage Upload
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client.storage
        .from(bucket)
        .upload(fileName, buffer, {
          contentType,
          upsert: true,
        });

      if (error) {
        console.error(`[STORAGE ERROR] Failed to upload to Supabase bucket '${bucket}':`, error.message);
      } else {
        const { data: publicData } = client.storage
          .from(bucket)
          .getPublicUrl(fileName);

        if (publicData?.publicUrl) {
          return publicData.publicUrl;
        }
      }
    } catch (err: any) {
      console.warn("[STORAGE CLOUD UPLOAD EXCEPTION]", err?.message || err);
    }
  }

  // 4. Offline / Local Development Fallback: write to public/uploads/
  try {
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const localName = `${cleanId}-${Date.now()}.${extension}`;
    const localFilePath = path.join(uploadsDir, localName);
    fs.writeFileSync(localFilePath, buffer);
    return `/uploads/${localName}`;
  } catch (fsErr: any) {
    console.error("[STORAGE LOCAL DISK FALLBACK FAILED]", fsErr?.message || fsErr);
    // Absolute last resort: return raw string to guarantee no data loss
    return typeof payload === "string" ? payload : "";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Chat Attachment Helpers
// ─────────────────────────────────────────────────────────────────────────────

export const CHAT_ATTACHMENT_BUCKET = "chat-attachments";

export const ALLOWED_ATTACHMENT_MIME_TYPES: Record<string, string> = {
  "image/jpeg": "image",
  "image/jpg": "image",
  "image/png": "image",
  "image/gif": "image",
  "image/webp": "image",
  "video/mp4": "video",
  "video/quicktime": "video",
  "video/webm": "video",
  "application/pdf": "pdf",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "ppt",
};

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 MB

export interface ChatAttachmentUploadResult {
  storagePath: string;   // path inside bucket e.g. "conv-id/timestamp-filename.jpg"
  attachmentType: string; // 'image' | 'video' | 'pdf' | 'ppt'
  attachmentName: string; // original filename
  attachmentSize: number; // bytes
}

/**
 * Uploads a file Buffer to the private 'chat-attachments' Supabase Storage bucket.
 * Returns the storage path (NOT a public URL — use getChatAttachmentSignedUrl to serve it).
 */
export async function uploadChatAttachment(
  fileBuffer: Buffer,
  originalName: string,
  mimeType: string,
  conversationId: string
): Promise<ChatAttachmentUploadResult | null> {
  const client = getSupabaseClient();
  if (!client) {
    console.warn("[STORAGE] Supabase client unavailable — cannot upload chat attachment");
    return null;
  }

  const attachmentType = ALLOWED_ATTACHMENT_MIME_TYPES[mimeType];
  if (!attachmentType) {
    console.warn("[STORAGE] Unsupported MIME type for chat attachment:", mimeType);
    return null;
  }

  // Sanitize filename: strip path traversal characters
  const safeName = originalName.replace(/[^a-zA-Z0-9._\-\s]/g, "_").replace(/\s+/g, "_").slice(0, 120);
  const storagePath = `${conversationId}/${Date.now()}-${safeName}`;

  const { error } = await client.storage
    .from(CHAT_ATTACHMENT_BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) {
    console.error("[STORAGE] Chat attachment upload failed:", error.message);
    return null;
  }

  return {
    storagePath,
    attachmentType,
    attachmentName: safeName,
    attachmentSize: fileBuffer.length,
  };
}

/**
 * Generates a signed URL for a private chat attachment, valid for the given TTL (default 1 hour).
 * Returns null if the client is unavailable or signing fails.
 */
export async function getChatAttachmentSignedUrl(
  storagePath: string,
  expiresInSeconds = 3600
): Promise<string | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  const { data, error } = await client.storage
    .from(CHAT_ATTACHMENT_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error || !data?.signedUrl) {
    console.warn("[STORAGE] Failed to generate signed URL:", error?.message);
    return null;
  }

  return data.signedUrl;
}
