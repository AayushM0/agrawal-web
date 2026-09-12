import type { SessionData } from "@/actions/auth";

export function calculateAge(dobStr?: string): number | null {
  if (!dobStr || !dobStr.trim()) return null;
  const birthDate = new Date(dobStr.trim());
  if (isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
}

export function extractBirthYear(dobStr?: string): number | null {
  if (!dobStr || !dobStr.trim()) return null;
  const clean = dobStr.trim();
  const yearMatch = clean.match(/^(\d{4})/);
  if (yearMatch) {
    const y = parseInt(yearMatch[1], 10);
    if (y >= 1900 && y <= new Date().getFullYear()) {
      return y;
    }
  }
  const date = new Date(clean);
  if (!isNaN(date.getTime())) {
    const y = date.getFullYear();
    if (y >= 1900 && y <= new Date().getFullYear()) {
      return y;
    }
  }
  return null;
}

export function maskPhone(phone?: string): string {
  if (!phone) return "Not provided";
  const clean = phone.trim();
  if (clean.length <= 4) return "••••";
  return clean.slice(0, 3) + " •••••• " + clean.slice(-4);
}

export function maskEmail(email?: string): string {
  if (!email || !email.includes("@")) return "Not provided";
  const [local, domain] = email.split("@");
  if (local.length <= 2) return `${local.slice(0, 1)}••••@${domain}`;
  return `${local.slice(0, 1)}••••${local.slice(-1)}@${domain}`;
}

export function maskGovtId(id?: string): string {
  if (!id) return "••••";
  const clean = id.trim();
  if (clean.length <= 4) return "••••";
  return clean.slice(0, 2) + "••••••••" + clean.slice(-2);
}

export function maskContact(contact?: string | null): string {
  if (!contact) return "Not provided";
  const clean = contact.trim();
  if (clean.includes("@")) {
    return maskEmail(clean);
  }
  return maskPhone(clean);
}

export function sanitizeMemberProfile(member: any, session: SessionData | null): any {
  if (!member) return null;

  const birthYear = extractBirthYear(member.dob);

  const isGovtIdVerified = Boolean(
    member.aadhaarNumber || member.panNumber || member.passportNumber || member.govtIdNumber || member.isGovtIdVerified
  );

  const isSelf =
    Boolean(session &&
    (String(member.id) === String(session.userId) ||
      (member.phone && member.phone === session.contact) ||
      (member.email && member.email.toLowerCase() === session.contact.toLowerCase())));

  // In the community directory, sensitive identity proofs (Aadhaar, PAN, Passport, Govt ID)
  // and full residential street addresses are NEVER exposed, even to admins or self.
  // (Admins audit KYC proofs inside /admin/moderation; members manage details in /dashboard).
  return {
    ...member,
    phone: isSelf ? member.phone : maskPhone(member.phone),
    email: isSelf ? member.email : maskEmail(member.email),
    dob: undefined, // Protect exact birth day and month from public directory view
    birthYear,
    isGovtIdVerified,
    aadhaarNumber: undefined, // Never expose government IDs in directory
    panNumber: undefined,
    passportNumber: undefined,
    govtIdNumber: undefined,
    fullAddress: undefined, // Protect full street address from directory
  };
}

export function sanitizeMatrimonialProfile(profile: any, canManage = false): any {
  if (!profile) return null;

  return {
    ...profile,
    contactPhone: canManage ? profile.contactPhone : maskPhone(profile.contactPhone),
    secondaryPhone: canManage
      ? profile.secondaryPhone
      : profile.secondaryPhone
      ? maskPhone(profile.secondaryPhone)
      : undefined,
    contactEmail: canManage
      ? profile.contactEmail
      : profile.contactEmail
      ? maskEmail(profile.contactEmail)
      : undefined,
    residentialAddress: undefined, // Never expose full street address publicly on matrimonial profiles
    aadhaarNumber: undefined,
    panNumber: undefined,
    passportNumber: undefined,
    govtIdNumber: undefined,
  };
}

