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
