import { createClient, SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

export function getSupabaseUrl(): string | null {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return process.env.NEXT_PUBLIC_SUPABASE_URL;
  }
  // Default fallback project URL for Maharaja Agrasen Foundation
  return "https://ruxqfbfjfnvqqcukiehn.supabase.co";
}

export function getSupabaseAnonKey(): string | null {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || null;
}

export function isSupabaseRealtimeAvailable(): boolean {
  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();
  return Boolean(url && anonKey);
}

export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (typeof window === "undefined") return null;
  if (browserClient) return browserClient;

  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();

  if (!url || !anonKey) {
    return null;
  }

  try {
    browserClient = createClient(url, anonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
    return browserClient;
  } catch (err) {
    console.warn("[SUPABASE REALTIME INIT ERROR]", err);
    return null;
  }
}
