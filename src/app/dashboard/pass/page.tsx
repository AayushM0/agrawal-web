import { redirect } from "next/navigation";
import { getCurrentHouseholdDashboard } from "@/actions/dashboard";
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
    serialNo: member.serialNo || (member as any).serialNo || household.serialNo || household.householdCode,
    nativePlace: household.nativePlace,
    currentCity: member.currentCity,
    roleLabel,
    memberSince,
    photoUrl: member.photoUrl || "",
    allMembers: isHead
      ? household.members.map((m) => ({ id: m.id, fullName: m.fullName, relationToHead: m.relationToHead }))
      : null,
    currentMemberId: member.id,
  };

  return <LanyardPassClient passData={passData} />;
}
