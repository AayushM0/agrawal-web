'use server';

import { db } from "@/lib/db";
import { getSession } from "@/actions/auth";

// Rate Limit Store for Contact Reveals (50 reveals per day limit per member)
const revealRateLimits = new Map<string, { count: number; resetAt: number }>();

export interface RevealContactInput {
  targetMemberId: string;
}

export async function revealContact(input: RevealContactInput | string) {
  const targetMemberId = typeof input === "string" ? input : input.targetMemberId;
  const session = await getSession();

  if (!session || !session.userId) {
    return {
      success: false,
      error: "Authentication required: Please sign in as a verified member to reveal direct contact details.",
    };
  }

  const viewerId = session.userId;
  const now = Date.now();
  const userLimit = revealRateLimits.get(viewerId) || { count: 0, resetAt: now + 24 * 60 * 60 * 1000 };

  // Check 24-hour window reset
  if (now > userLimit.resetAt) {
    userLimit.count = 0;
    userLimit.resetAt = now + 24 * 60 * 60 * 1000;
  }

  // Enforce Max 50 daily reveals to prevent automated scraping
  if (userLimit.count >= 50) {
    return {
      success: false,
      error: "Daily contact reveal limit reached (50/day). This protection prevents automated directory scraping.",
    };
  }

  // Fetch target member directly from database
  const target = await db.getMemberById(targetMemberId);
  if (!target) {
    return { success: false, error: "Member profile not found." };
  }

  if (target.visibility?.contactInfo === "hidden") {
    return { success: false, error: "This member has chosen to keep their contact details private." };
  }

  // Increment audit count
  userLimit.count += 1;
  revealRateLimits.set(viewerId, userLimit);

  console.log(`[AUDIT LOG] Verified Viewer ${viewerId} (${session.contact}) revealed contact for ${target.fullName} (${target.id})`);

  return {
    success: true,
    phone: target.phone || "Not listed",
    email: target.email || "Not listed",
    revealsRemainingToday: 50 - userLimit.count,
  };
}