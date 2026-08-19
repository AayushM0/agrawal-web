'use server';

import { db } from "@/lib/db";
import { getSession } from "@/actions/auth";
import { Household } from "@/types/household";

export async function getCurrentHouseholdDashboard(): Promise<{
  success: boolean;
  household: Household | null;
  sessionContact: string | null;
}> {
  const session = await getSession();
  if (!session || !session.contact) {
    // Fallback: try finding first live household for preview
    const all = await db.getHouseholds();
    const fallback = all[0] || null;
    return {
      success: true,
      household: fallback,
      sessionContact: null,
    };
  }

  const household = await db.getHouseholdByContact(session.contact);
  if (!household) {
    const all = await db.getHouseholds();
    return {
      success: true,
      household: all[0] || null,
      sessionContact: session.contact,
    };
  }

  return {
    success: true,
    household,
    sessionContact: session.contact,
  };
}