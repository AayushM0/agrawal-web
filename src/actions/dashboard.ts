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
    return {
      success: true,
      household: null,
      sessionContact: null,
    };
  }

  const household = await db.getHouseholdByContact(session.contact);
  return {
    success: true,
    household: household || null,
    sessionContact: session.contact,
  };
}