import { redirect } from "next/navigation";
import { getCurrentHouseholdDashboard } from "@/actions/dashboard";
import QRCode from "qrcode";
import LanyardPassClient from "./LanyardPassClient";

export default async function PassPage({
  searchParams,
}: {
  searchParams: Promise<{ memberId?: string }>;
}) {
  const { household, sessionContact } = await getCurrentHouseholdDashboard();
  if (!household || !sessionContact) redirect("/login");

  const params = await searchParams;
  const requestedId = params.memberId;

  // Determine which member's pass to show
  const isHead = household.verifiedContact === sessionContact;
  let member = requestedId
    ? household.members.find((m) => m.id === requestedId)
    : household.members.find((m) =>
        isHead
          ? m.relationToHead === "self"
          : m.phone === sessionContact || m.email === sessionContact
      );

  // Fallback to head member
  if (!member) member = household.members.find((m) => m.relationToHead === "self");
  if (!member) redirect("/dashboard");

  // Generate QR SVG server-side — points to public directory listing
  const profileUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "https://agarwal-directory.vercel.app"}/directory/${household.id}`;
  const qrSvg = await QRCode.toString(profileUrl, {
    type: "svg",
    width: 80,
    margin: 1,
    color: { dark: "#1c1917", light: "#ffffff" },
  });

  // Format date nicely
  const memberSince = new Date(household.createdAt).getFullYear();
  const roleLabel =
    member.relationToHead === "self"
      ? "Head of Household"
      : member.relationToHead.charAt(0).toUpperCase() + member.relationToHead.slice(1);

  const passData = {
    fullName: member.fullName,
    fatherName: member.fatherName || "",
    gotra: household.gotra,
    householdCode: household.householdCode,
    nativePlace: household.nativePlace,
    currentCity: [member.currentCity, member.currentCountry].filter(Boolean).join(", "),
    roleLabel,
    memberSince,
    photoUrl: member.photoUrl || "",
    qrSvg,
    profileUrl,
    // show all members for the switcher (head only)
    allMembers: isHead
      ? household.members.map((m) => ({ id: m.id, fullName: m.fullName, relationToHead: m.relationToHead }))
      : null,
    currentMemberId: member.id,
  };

  return <LanyardPassClient passData={passData} />;
}
