import { NextResponse } from "next/server";
import { getSession } from "@/actions/auth";
import { db } from "@/lib/db";
import { certificateFilename, renderBusinessCertificate } from "@/lib/business-certificate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const business = await db.getBusinessProfileById(id);
    if (!business || business.status !== "live" || !business.isVerifiedBadge) {
      return NextResponse.json({ error: "Certificate is unavailable for this business." }, { status: 404 });
    }
    const authorized = session.role === "admin" || await db.isProfileManager(id, "member", session.userId);
    if (!authorized) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const issuance = await db.getActiveBusinessCertificateIssuance(id);
    if (!issuance) return NextResponse.json({ error: "Certificate is unavailable for this business." }, { status: 404 });

    const buffer = await renderBusinessCertificate(business, issuance.issuedAt);
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${certificateFilename(business)}"`,
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("[BUSINESS CERTIFICATE ROUTE]", error);
    return NextResponse.json({ error: "Unable to generate the certificate. Please try again." }, { status: 500 });
  }
}
