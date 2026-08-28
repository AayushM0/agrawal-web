import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { PassPDF } from "@/components/PassPDF";
import { db } from "@/lib/db";
import { getSession } from "@/actions/auth";
import { createUnifiedPassData } from "@/lib/pass";
import React from "react";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get("memberId");

    if (!memberId) {
      return NextResponse.json({ error: "Missing memberId" }, { status: 400 });
    }

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const member = await db.getMemberById(memberId);
    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // IDOR Protection: Verify caller is Admin, Self, or part of same Household
    let isAuthorized = session.role === "admin";
    if (!isAuthorized) {
      const isSelf =
        member.id === session.userId ||
        (member.phone && member.phone === session.contact) ||
        (member.email && member.email.toLowerCase() === session.contact.toLowerCase());

      if (isSelf) {
        isAuthorized = true;
      } else if (session.contact) {
        const userHousehold = await db.getHouseholdByContact(session.contact);
        if (
          userHousehold &&
          (userHousehold.id === member.household_id ||
            userHousehold.id === member.householdId ||
            userHousehold.householdCode === member.householdCode)
        ) {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to download this ID pass." },
        { status: 403 }
      );
    }

    const passData = createUnifiedPassData({
      member: {
        ...member,
        serialNo: member.serialNo || member.householdCode,
      },
    });

    const buffer = await renderToBuffer(React.createElement(PassPDF, { passData }) as any);

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="ID_Card_${passData.fullName.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf"`,
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (err: any) {
    console.error("[PDF GENERATION ROUTE ERROR]", err);
    return NextResponse.json(
      { error: "Failed to generate PDF pass." },
      { status: 500 }
    );
  }
}
