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

/**
 * Permanently removes an uploaded member photo from storage (Supabase or local disk).
 * Used during account deletion to fulfill DPDP/PDPA Right to Erasure obligations.
 */
export async function deleteMemberPhoto(photoUrl?: string | null): Promise<boolean> {
  if (!photoUrl || typeof photoUrl !== "string") return false;
  const trimmed = photoUrl.trim();
  if (!trimmed || trimmed.startsWith("data:")) return false;

  try {
    // 1. Local disk storage cleanup
    if (trimmed.startsWith("/uploads/")) {
      const filename = path.basename(trimmed);
      const filePath = path.join(process.cwd(), "public", "uploads", filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return true;
    }

    // 2. Supabase Storage cleanup
    const client = getSupabaseClient();
    if (client && trimmed.includes("/storage/v1/object/public/")) {
      const parts = trimmed.split("/storage/v1/object/public/")[1];
      if (parts) {
        const slashIdx = parts.indexOf("/");
        if (slashIdx > -1) {
          const bucket = parts.substring(0, slashIdx);
          const objectPath = parts.substring(slashIdx + 1);
          await client.storage.from(bucket).remove([objectPath]);
          return true;
        }
      }
    }
  } catch (err) {
    console.warn("[STORAGE] deleteMemberPhoto warning:", err);
  }

  return false;
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

export const ALLOWED_ATTACHMENT_EXTENSIONS: Record<string, string[]> = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/jpg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/gif": ["gif"],
  "image/webp": ["webp"],
  "video/mp4": ["mp4"],
  "video/quicktime": ["mov", "qt"],
  "video/webm": ["webm"],
  "application/pdf": ["pdf"],
  "application/vnd.ms-powerpoint": ["ppt"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ["pptx"],
};

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * Validates file buffer magic bytes against declared MIME type to prevent type spoofing.
 */
export function validateAttachmentMagicBytes(buffer: Buffer, mimeType: string): boolean {
  if (!buffer || buffer.length < 4) return false;

  switch (mimeType) {
    case "image/jpeg":
    case "image/jpg":
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    case "image/png":
      return (
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47
      );
    case "image/gif":
      return (
        buffer[0] === 0x47 &&
        buffer[1] === 0x49 &&
        buffer[2] === 0x46 &&
        buffer[3] === 0x38
      );
    case "image/webp":
      return (
        buffer.length >= 12 &&
        buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
        buffer.subarray(8, 12).toString("ascii") === "WEBP"
      );
    case "application/pdf":
      return buffer.subarray(0, 5).toString("ascii") === "%PDF-";
    case "video/mp4":
      return buffer.length >= 8 && buffer.subarray(4, 8).toString("ascii") === "ftyp";
    case "video/quicktime":
      if (buffer.length < 8) return false;
      const tag = buffer.subarray(4, 8).toString("ascii");
      return ["ftyp", "moov", "mdat", "wide"].includes(tag);
    case "video/webm":
      return (
        buffer[0] === 0x1a &&
        buffer[1] === 0x45 &&
        buffer[2] === 0xdf &&
        buffer[3] === 0xa3
      );
    case "application/vnd.ms-powerpoint":
      return (
        buffer[0] === 0xd0 &&
        buffer[1] === 0xcf &&
        buffer[2] === 0x11 &&
        buffer[3] === 0xe0
      );
    case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      return (
        buffer[0] === 0x50 &&
        buffer[1] === 0x4b &&
        buffer[2] === 0x03 &&
        buffer[3] === 0x04
      );
    default:
      return false;
  }
}

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
