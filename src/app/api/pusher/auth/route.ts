import { NextRequest, NextResponse } from "next/server";
import Pusher from "pusher";
import { getSession } from "@/actions/auth";
import { db } from "@/lib/db";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  try {
    // 1. Validate session cookie
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json(
        { error: "Unauthorized: Active session required." },
        { status: 401 }
      );
    }

    const currentMemberId = session.userId;

    // 2. Parse body (supports both application/x-www-form-urlencoded and JSON)
    let socketId = "";
    let channelName = "";

    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await request.formData();
      socketId = formData.get("socket_id") as string;
      channelName = formData.get("channel_name") as string;
    } else {
      const json = await request.json().catch(() => ({}));
      socketId = json.socket_id;
      channelName = json.channel_name;
    }

    if (!socketId || !channelName) {
      return NextResponse.json(
        { error: "Missing socket_id or channel_name" },
        { status: 400 }
      );
    }

    // 3. IDOR permission gate: validate the channel the client is requesting
    if (channelName.startsWith("private-chat-room-")) {
      // Chat room channel: caller must be a participant in this conversation
      const conversationId = channelName.replace("private-chat-room-", "");

      if (!UUID_REGEX.test(conversationId)) {
        return NextResponse.json(
          { error: "Invalid conversation ID format." },
          { status: 400 }
        );
      }

      const conversation = await db.getConversationById(conversationId);
      if (!conversation) {
        return NextResponse.json(
          { error: "Conversation not found." },
          { status: 404 }
        );
      }

      const isParticipant =
        String(conversation.initiator_id) === String(currentMemberId) ||
        String(conversation.recipient_id) === String(currentMemberId);

      if (!isParticipant) {
        return NextResponse.json(
          { error: "Forbidden: You are not a participant in this conversation." },
          { status: 403 }
        );
      }
    } else if (channelName.startsWith("private-user-")) {
      // User notification channel: caller must match the channel's member ID exactly
      const targetMemberId = channelName.replace("private-user-", "");
      if (String(targetMemberId) !== String(currentMemberId)) {
        return NextResponse.json(
          { error: "Forbidden: You cannot subscribe to another user's notifications." },
          { status: 403 }
        );
      }
    } else {
      // Any other private-* namespace is rejected
      return NextResponse.json(
        { error: "Forbidden: Invalid channel namespace." },
        { status: 403 }
      );
    }

    // 4. All checks passed — sign the Pusher auth token
    const pusher = new Pusher({
      appId: process.env.PUSHER_APP_ID || "mock_id",
      key: process.env.NEXT_PUBLIC_PUSHER_APP_KEY || "mock_key",
      secret: process.env.PUSHER_SECRET || "mock_secret",
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "us2",
      useTLS: true,
    });

    const authResponse = pusher.authorizeChannel(socketId, channelName);
    return NextResponse.json(authResponse);
  } catch (err: any) {
    console.error("Pusher auth error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
