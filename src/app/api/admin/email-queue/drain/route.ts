import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/actions/auth";
import { drainEmailQueue } from "@/lib/email-queue";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (session?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized: Admin privileges required" }, { status: 403 });
    }

    let maxItems = 8;
    try {
      const body = await req.json();
      if (typeof body?.maxItems === "number" && body.maxItems > 0 && body.maxItems <= 20) {
        maxItems = body.maxItems;
      }
    } catch (_) {}

    const result = await drainEmailQueue({ maxItems, timeoutMs: 6500 });
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    console.error("[API DRAIN ERROR]", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
