import { NextResponse } from "next/server";
import { renderToStream } from "@react-pdf/renderer";
import { PassPDF } from "@/components/PassPDF";
import { db } from "@/lib/db";
import { getSession } from "@/actions/auth";
import React from "react";

export async function GET(request: Request) {
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
      if (userHousehold && (userHousehold.id === member.household_id || userHousehold.householdCode === member.householdCode)) {
        isAuthorized = true;
      }
    }
  }

  if (!isAuthorized) {
    return NextResponse.json({ error: "Forbidden: You do not have permission to download this ID pass." }, { status: 403 });
  }

  const passData = {
    fullName: member.fullName,
    gotra: member.gotra,
    householdCode: member.householdCode,
    serialNo: member.serialNo || member.householdCode,
    currentCity: member.currentCity,
    roleLabel: member.relationToHead,
    photoUrl: member.photoUrl,
    nativePlace: member.nativePlace,
    fatherName: member.fatherName,
  };

  const stream = await renderToStream(React.createElement(PassPDF, { passData }) as any);
  
  return new Response(stream as any, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="ID_Card_${passData.fullName.replace(/\s+/g, "_")}.pdf"`,
    },
  });
}
