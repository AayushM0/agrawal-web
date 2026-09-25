export interface LinkedDirector {
  memberId: string;
  serialNo?: string;
  name: string;
  roleTitle: string;
  isPrimaryContact: boolean;
}

export interface BusinessCustomField {
  id: string;
  label: string;
  value: string;
}

export interface BusinessSocialLinks {
  linkedin?: string;
  twitter?: string;
  facebook?: string;
  instagram?: string;
}

export interface BusinessProfile {
  id: string;
  householdId: string;
  createdByMemberId: string;
  status: "pending_review" | "live" | "paused" | "rejected";
  rejectionReason?: string;

  // Identity & Overview
  businessName: string;
  legalName?: string;
  tagline?: string;
  industrySector: string;
  businessType: string;
  yearEstablished?: number;
  aboutBusiness: string;
  offeringsSummary?: string;

  // Verification & Compliance
  registrationType?: string;
  registrationNumber?: string;
  isVerifiedBadge: boolean;

  // Location
  country: string;
  state: string;
  city: string;
  pincode?: string;
  addressLine?: string;

  // Online & Media
  websiteUrl?: string;
  socialLinks: BusinessSocialLinks;
  photos: string[]; // 1 to 3 URLs or base64 data URIs
  customFields: BusinessCustomField[];

  // Leadership & Governance
  linkedDirectors: LinkedDirector[];

  createdAt: string;
  updatedAt: string;
}
