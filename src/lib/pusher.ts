/**
 * Pusher configuration helpers.
 * Checks whether all required Pusher environment variables are present.
 * Used to conditionally enable real-time WebSocket events vs. silent
 * fallback to HTTP polling.
 */

export function isPusherConfigured(): boolean {
  const hasServerKeys = Boolean(
    process.env.PUSHER_APP_ID &&
    process.env.NEXT_PUBLIC_PUSHER_APP_KEY &&
    process.env.PUSHER_SECRET &&
    process.env.NEXT_PUBLIC_PUSHER_CLUSTER
  );
  return hasServerKeys;
}
