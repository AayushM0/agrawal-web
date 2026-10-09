import { NextResponse } from "next/server";
import { getSession } from "@/actions/auth";
import { db } from "@/lib/db";
import { renderBiodataPdf } from "@/lib/matrimony-pdf";
import { canAccessMatrimonialBiodata } from "@/lib/matrimony-access";

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

    const allowed = await canAccessMatrimonialBiodata(session, profile);
    if (!allowed) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const pdf = await renderBiodataPdf(profile);
    return new Response(new Uint8Array(pdf), { headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename(profile.fullName)}"`,
      "Cache-Control": "private, no-store, must-revalidate",
    }});
  } catch (error: any) {
    if (error?.message?.includes("timed out") || error?.code === "ETIMEDOUT") {
      return NextResponse.json({ error: "PDF generation timed out" }, { status: 504 });
    }
    console.error("[MATRIMONY BIODATA PDF]", error);
    return NextResponse.json({ error: "Unable to generate biodata PDF." }, { status: 500 });
  }
}
