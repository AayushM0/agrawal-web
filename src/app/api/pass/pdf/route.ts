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

  const household = await db.getHouseholdById(member.householdId);

  const passData = {
    fullName: member.fullName,
    gotra: household.gotra,
    householdCode: household.householdCode,
    currentCity: member.currentCity,
    roleLabel: member.relationToHead,
    photoUrl: member.photoUrl,
  };

  const stream = await renderToStream(React.createElement(PassPDF, { passData }));
  
  return new Response(stream as any, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="ID_Card_${passData.fullName.replace(/\s+/g, "_")}.pdf"`,
    },
  });
}
