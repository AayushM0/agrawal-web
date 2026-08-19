'use server';

import { db } from "@/lib/db";

// In-Memory Rate Limit Store for Contact Reveals (50 reveals per day limit per member)
const revealRateLimits = new Map<string, { count: number; resetAt: number }>();

export interface RevealContactInput {
  viewerUserId: string;
  targetMemberId: string;
}

export async function revealContact(input: RevealContactInput) {
  const now = Date.now();
  const userLimit = revealRateLimits.get(input.viewerUserId) || { count: 0, resetAt: now + 24 * 60 * 60 * 1000 };

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

  // Increment audit count
  userLimit.count += 1;
  revealRateLimits.set(input.viewerUserId, userLimit);

  // Fetch all members to find the target
  const members = await db.getAllMembers();
  const target = members.find((m) => m.id === input.targetMemberId);

  if (!target) {
    return { success: false, error: "Member profile not found." };
  }

  if (target.visibility.contactInfo === "hidden") {
    return { success: false, error: "This member has chosen to keep their contact details private." };
  }

  console.log(`[AUDIT LOG] Viewer ${input.viewerUserId} revealed contact for ${target.fullName} (${target.id})`);

  return {
    success: true,
    phone: target.phone || "+91 98765 43210",
    email: target.email || "member@agrawal-community.org",
    revealsRemainingToday: 50 - userLimit.count,
  };
}