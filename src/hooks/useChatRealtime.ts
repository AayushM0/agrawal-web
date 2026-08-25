'use client';

import { useEffect, useState, useRef } from "react";
import { getSupabaseBrowserClient, isSupabaseRealtimeAvailable } from "@/lib/supabaseClient";

interface UseChatRealtimeOptions {
  conversationId: string | null;
  onNewMessage: (message: any) => void;
  onConversationUpdate?: (conversation: any) => void;
}

export function useChatRealtime({
  conversationId,
  onNewMessage,
  onConversationUpdate,
}: UseChatRealtimeOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const onNewMessageRef = useRef(onNewMessage);
  const onConversationUpdateRef = useRef(onConversationUpdate);

  useEffect(() => {
    onNewMessageRef.current = onNewMessage;
    onConversationUpdateRef.current = onConversationUpdate;
  }, [onNewMessage, onConversationUpdate]);

  useEffect(() => {
    if (!conversationId) {
      setIsConnected(false);
      return;
    }

    if (!isSupabaseRealtimeAvailable()) {
      setIsConnected(false);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setIsConnected(false);
      return;
    }

    const channelName = `chat:conv:${conversationId}`;
    const channel = supabase.channel(channelName);

    channel
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: any) => {
          const row = payload.new;
          if (row) {
            onNewMessageRef.current?.({
              id: row.id,
              conversationId: row.conversation_id,
              senderId: row.sender_id,
              recipientId: row.recipient_id,
              messageBody: row.message_body,
              isFlagged: row.is_flagged,
              flagReason: row.flag_reason,
              readAt: row.read_at,
              createdAt: row.created_at,
            });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "conversations",
          filter: `id=eq.${conversationId}`,
        },
        (payload: any) => {
          if (payload.new) {
            onConversationUpdateRef.current?.(payload.new);
          }
        }
      )
      .subscribe((status: string) => {
        if (status === "SUBSCRIBED") {
          setIsConnected(true);
        } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
          setIsConnected(false);
        }
      });

    return () => {
      supabase.removeChannel(channel);
      setIsConnected(false);
    };
  }, [conversationId]);

  return {
    isConnected,
    isRealtimeSupported: isSupabaseRealtimeAvailable(),
  };
}
