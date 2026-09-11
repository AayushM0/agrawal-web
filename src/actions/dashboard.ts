'use server';

import { db } from "@/lib/db";
import { getSession } from "@/actions/auth";
import { Household } from "@/types/household";

export async function getCurrentHouseholdDashboard(): Promise<{
  success: boolean;
  household: Household | null;
  sessionContact: string | null;
  isActivated: boolean;
  isPendingApproval?: boolean;
  householdStatus?: string;
}> {
  const session = await getSession();
  if (!session || !session.contact) {
    return {
      success: true,
      household: null,
      sessionContact: null,
      isActivated: false,
    };
  }

  const household = await db.getHouseholdByContact(session.contact);
  if (household && household.status !== "live") {
    return {
      success: true,
      household: null,
      sessionContact: session.contact,
      isActivated: false,
      isPendingApproval: household.status === "pending_review",
      householdStatus: household.status,
    };
  }

  return {
    success: true,
    household: household || null,
    sessionContact: session.contact,
    isActivated: session.isActivated !== false,
    householdStatus: household?.status,
  };
}