'use server';

import { db } from "../lib/db";
import type { Household, Member } from "../types/household";
import { gotras } from "../data/gotras";
import { normalizePhoneNumber } from "@/lib/phone";
import { createSession } from "./auth";

export interface RegisterHouseholdInput {
  headName: string;
  verifiedContact: string;
  gotra: string;
  nativePlace: string;
  country?: string;
  postalCode?: string;
  state?: string;
  city?: string;
  fullAddress?: string;
  aadhaarNumber?: string;
  panNumber?: string;
  passportNumber?: string;
  govtIdNumber?: string;
  members: Omit<Member, "id" | "verifiedBySelf" | "ownerLocked">[];
  consentAccepted: boolean;
}

const VALID_RELATIONS = new Set([
  "self", "spouse", "parent", "father", "mother", "son", "daughter",
  "brother", "sister", "daughter_in_law", "son_in_law",
  "grandson", "granddaughter", "other"
]);

const VALID_GENDERS = new Set(["male", "female", "other"]);
const VALID_MARITAL = new Set(["married", "unmarried", "widowed", "divorced"]);

export async function registerHousehold(input: RegisterHouseholdInput) {
  // 1. Consent Validation
  if (!input.consentAccepted) {
    return { success: false, error: "Consent to Privacy Policy and Terms is required." };
  }

  // 2. Head details sanitization and validation
  const cleanHeadName = input.headName?.trim();
  const cleanNativePlace = input.nativePlace?.trim();

  if (!cleanHeadName || cleanHeadName.length < 2 || cleanHeadName.length > 100) {
    return { success: false, error: "Head of Household name must be between 2 and 100 characters." };
  }

  if (!cleanNativePlace || cleanNativePlace.length < 2 || cleanNativePlace.length > 100) {
    return { success: false, error: "Ancestral native place (मूल निवास) must be between 2 and 100 characters." };
  }

  // 3. 18 Gotras Validation
  const inputGotra = input.gotra?.trim();
  const validGotraObj = gotras.find(
    (g) => g.name.toLowerCase() === inputGotra?.toLowerCase() || g.devanagari === inputGotra
  );
  if (!validGotraObj) {
    return { success: false, error: "Please select a valid Gotra from the 18 established Gotras." };
  }
  const canonicalGotra = validGotraObj.name;

  // 4. Contact Normalization
  const isPhone = !input.verifiedContact.includes("@");
  const canonicalContact = isPhone 
    ? normalizePhoneNumber(input.verifiedContact) 
    : input.verifiedContact.trim().toLowerCase();

  if (!canonicalContact || canonicalContact.length < 5) {
    return { success: false, error: "A valid verified mobile number or email address is required." };
  }

  // 5. Unique Contact Check (Prevent duplicate households)
  const existing = await db.getHouseholdByContact(canonicalContact);
  if (existing) {
    return {
      success: false,
      error: "A household registration already exists under this verified contact number or email.",
    };
  }

  // 6. Member Sub-Fields Validation
  if (!Array.isArray(input.members) || input.members.length === 0) {
    return { success: false, error: "At least one family member (Head of Household) must be added." };
  }

  const head = input.members[0];
  const headFatherName = head.fatherName?.trim();
  if (!headFatherName || headFatherName.length < 2 || headFatherName.length > 100) {
    return { success: false, error: "Father's Full Name (पिता का नाम) is required for Head of Household." };
  }

  const headPhone = head.phone?.trim() || (isPhone ? canonicalContact : undefined);
  if (isPhone && (!headPhone || headPhone.replace(/[^0-9]/g, "").length < 7)) {
    return { success: false, error: "A valid mobile phone number is required for Head of Household." };
  }

  const headEmail = head.email?.trim() || (!isPhone ? canonicalContact : undefined);
  if (!isPhone && (!headEmail || !headEmail.includes("@") || headEmail.length < 5)) {
    return { success: false, error: "A valid email address is required for Head of Household." };
  }

  // Address validation
  const country = input.country?.trim() || head.currentCountry?.trim() || "India";
  const postalCode = input.postalCode?.trim() || head.postalCode?.trim() || "";
  const state = input.state?.trim() || head.state?.trim() || "";
  const city = input.city?.trim() || head.currentCity?.trim() || "";
  const fullAddress = input.fullAddress?.trim() || head.fullAddress?.trim() || "";

  if (!postalCode || postalCode.length < 3) {
    return { success: false, error: "A valid Postal/PIN code is required." };
  }
  if (!city || city.length < 2) {
    return { success: false, error: "City / District is required." };
  }
  if (!fullAddress || fullAddress.length < 5) {
    return { success: false, error: "Complete residential address is required." };
  }

  // Country-Specific Government ID Validation
  const isIndia = country.toLowerCase() === "india" || country.toUpperCase() === "IN";
  const cleanAadhaar = input.aadhaarNumber?.replace(/[^0-9]/g, "") || head.aadhaarNumber?.replace(/[^0-9]/g, "");
  const cleanPan = input.panNumber?.trim().toUpperCase() || head.panNumber?.trim().toUpperCase();
  const cleanPassport = input.passportNumber?.trim().toUpperCase() || head.passportNumber?.trim().toUpperCase();
  const cleanGovtId = input.govtIdNumber?.trim().toUpperCase() || head.govtIdNumber?.trim().toUpperCase();

  if (isIndia) {
    if (!cleanAadhaar || cleanAadhaar.length !== 12) {
      return { success: false, error: "A valid 12-digit Aadhaar Number is required for Indian residents." };
    }
    if (!cleanPan || !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleanPan)) {
      return { success: false, error: "A valid 10-character PAN Number (e.g. ABCDE1234F) is required." };
    }
  } else {
    if (!cleanPassport || cleanPassport.length < 5) {
      return { success: false, error: "A valid Passport Number is required for international members." };
    }
    if (!cleanGovtId || cleanGovtId.length < 3) {
      return { success: false, error: "A valid Government Issued ID / Tax ID is required." };
    }
  }

  // Check contact conflicts for Head's Phone & Email
  if (headPhone) {
    const phoneConflict = await db.checkContactExists(headPhone);
    if (phoneConflict.exists && phoneConflict.type === "head") {
      const existingH = await db.getHouseholdByContact(canonicalContact);
      if (!existingH || existingH.householdCode !== phoneConflict.householdCode) {
        return {
          success: false,
          error: `The mobile number '${headPhone}' is already registered in the directory (${phoneConflict.name ? `under ${phoneConflict.name}` : `#${phoneConflict.householdCode}`}).`,
        };
      }
    }
  }

  if (headEmail) {
    const emailConflict = await db.checkContactExists(headEmail);
    if (emailConflict.exists && emailConflict.type === "head") {
      const existingH = await db.getHouseholdByContact(canonicalContact);
      if (!existingH || existingH.householdCode !== emailConflict.householdCode) {
        return {
          success: false,
          error: `The email address '${headEmail}' is already registered in the directory (${emailConflict.name ? `under ${emailConflict.name}` : `#${emailConflict.householdCode}`}).`,
        };
      }
    }
  }

  for (let i = 0; i < input.members.length; i++) {
    const m = input.members[i];
    const memberName = m.fullName?.trim();
    if (!memberName || memberName.length < 2 || memberName.length > 100) {
      return { success: false, error: `Member #${i + 1} name must be between 2 and 100 characters.` };
    }

    if (m.relationToHead && !VALID_RELATIONS.has(m.relationToHead.trim().toLowerCase())) {
      return { success: false, error: `Invalid relation '${m.relationToHead}' for member #${i + 1}.` };
    }

    if (m.gender && !VALID_GENDERS.has(m.gender.trim().toLowerCase())) {
      return { success: false, error: `Invalid gender '${m.gender}' for member #${i + 1}.` };
    }

    if (m.maritalStatus && !VALID_MARITAL.has(m.maritalStatus.trim().toLowerCase())) {
      return { success: false, error: `Invalid marital status '${m.maritalStatus}' for member #${i + 1}.` };
    }

    // Profile photo is strictly mandatory for Head and all members
    if (!m.photoUrl || !m.photoUrl.trim() || m.photoUrl.trim().length < 10) {
      return {
        success: false,
        error:
          i === 0
            ? "A recent profile photograph is mandatory for the Head of Household (मुखिया का फोटो अनिवार्य है)."
            : `A profile photograph is mandatory for ${memberName} (फोटो अनिवार्य है).`,
      };
    }

    // Check contact conflicts for additional members
    if (i > 0) {
      if (m.phone && m.phone.trim()) {
        const cleanMemberPhone = m.phone.trim();
        const normMemberPhone = cleanMemberPhone.includes("@") ? cleanMemberPhone : normalizePhoneNumber(cleanMemberPhone);
        if (normMemberPhone === canonicalContact || (headPhone && normMemberPhone === normalizePhoneNumber(headPhone))) {
          return {
            success: false,
            error: `Phone for ${memberName} cannot be identical to the Head of Household's contact. Please leave phone blank if they share the household contact.`,
          };
        }
        const phoneConflict = await db.checkContactExists(cleanMemberPhone);
        if (phoneConflict.exists) {
          return {
            success: false,
            error: `Phone '${cleanMemberPhone}' for ${memberName} is already registered in the directory (${phoneConflict.name ? `associated with ${phoneConflict.name}` : `#${phoneConflict.householdCode}`}).`,
          };
        }
      }

      if (m.email && m.email.trim()) {
        const cleanMemberEmail = m.email.trim().toLowerCase();
        if (cleanMemberEmail === canonicalContact || (headEmail && cleanMemberEmail === headEmail.trim().toLowerCase())) {
          return {
            success: false,
            error: `Email for ${memberName} cannot be identical to the Head of Household's contact. Please leave email blank if they share the household contact.`,
          };
        }
        const emailConflict = await db.checkContactExists(cleanMemberEmail);
        if (emailConflict.exists) {
          return {
            success: false,
            error: `Email '${cleanMemberEmail}' for ${memberName} is already registered in the directory (${emailConflict.name ? `associated with ${emailConflict.name}` : `#${emailConflict.householdCode}`}).`,
          };
        }
      }
    }
  }

  // 7. Create new Household with pending_review status
  const householdId = `h-${Date.now()}`;
  const householdCode = `AGR-2026-${Math.floor(100 + Math.random() * 900)}`;

  const structuredMembers: Member[] = input.members.map((m, idx) => {
    const hasIndividualContact = Boolean((m.phone && m.phone.trim()) || (m.email && m.email.trim()));
    const isAutoClaimed = idx === 0 || !hasIndividualContact;

    return {
      ...m,
      fullName: m.fullName.trim(),
      relationToHead: (m.relationToHead?.toLowerCase() as any) || (idx === 0 ? "self" : "other"),
      fatherName: m.fatherName?.trim() || undefined,
      photoUrl: m.photoUrl?.trim() || undefined,
      phone: m.phone ? (m.phone.includes("@") ? m.phone.trim() : normalizePhoneNumber(m.phone)) : undefined,
      email: m.email?.trim().toLowerCase() || undefined,
      currentCity: m.currentCity?.trim() || city || cleanNativePlace,
      currentCountry: m.currentCountry?.trim() || country,
      postalCode: m.postalCode?.trim() || postalCode,
      state: m.state?.trim() || state,
      fullAddress: m.fullAddress?.trim() || fullAddress,
      profession: m.profession?.trim() || "",
      professionTitle: m.professionTitle?.trim() || m.profession?.trim() || "",
      professionDescription: m.professionDescription?.trim() || undefined,
      aadhaarNumber: idx === 0 ? cleanAadhaar : (m.aadhaarNumber?.replace(/[^0-9]/g, "") || undefined),
      panNumber: idx === 0 ? cleanPan : (m.panNumber?.trim().toUpperCase() || undefined),
      passportNumber: idx === 0 ? cleanPassport : (m.passportNumber?.trim().toUpperCase() || undefined),
      govtIdNumber: idx === 0 ? cleanGovtId : (m.govtIdNumber?.trim().toUpperCase() || undefined),
      id: `m-${Date.now()}-${idx}`,
      verifiedBySelf: isAutoClaimed, // Head is self-verified; members without separate contact are auto-claimed
      ownerLocked: isAutoClaimed,
      visibility: {
        contactInfo: "hidden",
        dob: "hidden",
        photo: "public_to_members",
      },
    };
  });

  const newHousehold: Household = {
    id: householdId,
    householdCode,
    headUserId: `u-${Date.now()}`,
    headName: cleanHeadName,
    nativePlace: cleanNativePlace,
    gotra: canonicalGotra,
    country,
    postalCode,
    state,
    city,
    fullAddress,
    aadhaarNumber: isIndia ? cleanAadhaar : undefined,
    panNumber: isIndia ? cleanPan : undefined,
    passportNumber: !isIndia ? cleanPassport : undefined,
    govtIdNumber: !isIndia ? cleanGovtId : undefined,
    status: "pending_review",
    verifiedContact: canonicalContact,
    consentAcceptedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    members: structuredMembers,
  };

  const created = await db.createHousehold(newHousehold);

  // Automatically establish logged-in session for the newly registered Head of Household
  await createSession({
    userId: newHousehold.headUserId,
    role: "head",
    contact: canonicalContact,
    householdStatus: "pending_review",
  });

  return {
    success: true,
    householdCode: created.serialNo || householdCode,
    serialNo: created.serialNo || householdCode,
    message: "Registration submitted successfully into community moderation queue.",
  };
}

export async function checkContactRegistration(contact: string) {
  if (!contact || contact.trim().length < 5) {
    return { isRegistered: false };
  }
  const isPhone = !contact.includes("@");
  const canonicalContact = isPhone 
    ? normalizePhoneNumber(contact) 
    : contact.trim().toLowerCase();

  const existing = await db.getHouseholdByContact(canonicalContact);
  if (existing) {
    return {
      isRegistered: true,
      householdCode: existing.serialNo || existing.householdCode,
      headName: existing.headName,
    };
  }
  return { isRegistered: false };
}
