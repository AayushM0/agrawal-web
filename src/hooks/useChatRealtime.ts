'use client';

import { useEffect, useState, useRef } from "react";
import Pusher from "pusher-js";

let pusherClient: Pusher | null = null;

export function getPusherClient(): Pusher | null {
  if (typeof window === "undefined") return null;
  const key = process.env.NEXT_PUBLIC_PUSHER_APP_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
  if (!key || !cluster) return null;

  if (!pusherClient) {
    pusherClient = new Pusher(key, {
      cluster,
      authEndpoint: "/api/pusher/auth",
    });
  }
  return pusherClient;
}

interface UseChatRealtimeOptions {
  conversationId: string | null;
  currentMemberId?: string | null;
  onNewMessage: (message: any) => void;
  onConversationUpdate?: (conversation: any) => void;
  onSidebarRefresh?: () => void;
}

export function useChatRealtime({
  conversationId,
  currentMemberId,
  onNewMessage,
  onConversationUpdate,
  onSidebarRefresh,
}: UseChatRealtimeOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const onNewMessageRef = useRef(onNewMessage);
  const onConversationUpdateRef = useRef(onConversationUpdate);
  const onSidebarRefreshRef = useRef(onSidebarRefresh);

  useEffect(() => {
    onNewMessageRef.current = onNewMessage;
    onConversationUpdateRef.current = onConversationUpdate;
    onSidebarRefreshRef.current = onSidebarRefresh;
  }, [onNewMessage, onConversationUpdate, onSidebarRefresh]);

  useEffect(() => {
    const pusher = getPusherClient();
    if (!pusher) {
      setIsConnected(false);
      return;
    }

    // 1. Subscribe to global user notifications
    let userChannel: any = null;
    if (currentMemberId) {
      userChannel = pusher.subscribe(`private-user-${currentMemberId}`);
      userChannel.bind("incoming-message", () => {
        onSidebarRefreshRef.current?.();
      });
    }

    // 2. Subscribe to active chat room
    let chatChannel: any = null;
    if (conversationId) {
      chatChannel = pusher.subscribe(`private-chat-room-${conversationId}`);

      chatChannel.bind("new-message", (incomingMsg: any) => {
        onNewMessageRef.current?.(incomingMsg);
      });

      chatChannel.bind("conversation-updated", (updatedConv: any) => {
        onConversationUpdateRef.current?.(updatedConv);
      });

      chatChannel.bind("pusher:subscription_succeeded", () => {
        setIsConnected(true);
      });

      chatChannel.bind("pusher:subscription_error", () => {
        setIsConnected(false);
      });

      setIsConnected(true);
    } else {
      setIsConnected(false);
    }

    return () => {
      if (chatChannel) {
        chatChannel.unbind_all();
        pusher.unsubscribe(`private-chat-room-${conversationId}`);
      }
      if (userChannel) {
        userChannel.unbind_all();
        pusher.unsubscribe(`private-user-${currentMemberId}`);
      }
      setIsConnected(false);
    };
  }, [conversationId, currentMemberId]);

  return {
    isConnected,
    isRealtimeSupported: Boolean(process.env.NEXT_PUBLIC_PUSHER_APP_KEY),
  };
}
