import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
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
      return NextResponse.json({ error: "Missing socket_id or channel_name" }, { status: 400 });
    }

    return NextResponse.json({ parsed: { socketId, channelName } });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
