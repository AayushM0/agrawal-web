import { NextResponse } from "next/server";
import { getSession } from "@/actions/auth";
import { db } from "@/lib/db";
import { renderBiodataPdf } from "@/lib/matrimony-pdf";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function filename(name: string) {
  return `MAFL_Biodata_${name.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "") || "Profile"}.pdf`;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await db.getMatrimonialProfileById(id);
    if (!profile) return NextResponse.json({ error: "Not Found" }, { status: 404 });
    if (session.role !== "admin" && session.userId !== profile.createdByUserId && session.userId !== profile.memberId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const pdf = await renderBiodataPdf(profile);
    return new Response(new Uint8Array(pdf), { headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename(profile.fullName)}"`,
      "Cache-Control": "private, no-store, must-revalidate",
    }});
  } catch (error) {
    console.error("[MATRIMONY BIODATA PDF]", error);
    return NextResponse.json({ error: "Unable to generate biodata PDF." }, { status: 500 });
  }
}
