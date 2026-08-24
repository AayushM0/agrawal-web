import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Automated DPDP Act 2023 Compliance Cron Handler
 * Prunes unflagged directory messages older than 90 days.
 * Protected by Bearer token matching CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // Reject if CRON_SECRET is configured and does not match Authorization header
    if (cronSecret) {
      const token = authHeader?.replace(/^Bearer\s+/i, "");
      if (!token || token !== cronSecret) {
        return NextResponse.json({ error: "Unauthorized: Invalid CRON_SECRET" }, { status: 401 });
      }
    } else if (process.env.NODE_ENV === "production") {
      // Fail closed in production if secret is not configured
      return NextResponse.json({ error: "Unauthorized: CRON_SECRET not configured" }, { status: 401 });
    }

    const prunedCount = await db.pruneExpiredMessages(90);

    return NextResponse.json({
      success: true,
      message: `DPDP 90-day retention prune executed successfully.`,
      prunedCount,
      executedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Cron prune-messages failed:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to prune expired messages" },
      { status: 500 }
    );
  }
}
