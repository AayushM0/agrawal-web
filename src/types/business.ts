export interface LinkedDirector {
  source: "directory" | "manual";
  memberId?: string;
  serialNo?: string;
  name: string;
  roleTitle: string;
  isPrimaryContact: boolean;
  phone?: string;
  email?: string;
}

export type ProfileActorType = "member" | "admin";

export interface ProfileManagerAssignment {
  resourceType: "business";
  resourceId: string;
  creatorActorType: ProfileActorType;
  creatorActorId: string;
  managerActorType: ProfileActorType;
  managerActorId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileManagerHandover {
  id: string;
  resourceType: "business";
  resourceId: string;
  initiatedByActorType: ProfileActorType;
  initiatedByActorId: string;
  targetMemberId: string;
  status: "pending" | "accepted" | "cancelled" | "expired";
  expiresAt: string;
  createdAt: string;
}

export interface BusinessCertificateIssuance {
  id: string;
  businessId: string;
  generation: number;
  status: "active" | "inactive";
  issuedAt: string;
  issuedByAdminId?: string | null;
}

export interface BusinessCertificateDelivery {
  id: string;
  issuanceId: string;
  recipientEmail: string;
  recipientName?: string | null;
  emailQueueId?: string | null;
  deliveryKind: "approval" | "resend";
  failureReason?: string | null;
  createdAt: string;
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

  // Direct Contact & Communication (Fully Visible for Open Trade & Commercial Outreach)
  contactPhone?: string;
  contactEmail?: string;
  whatsappNumber?: string;

  // Verification & Compliance
  registrationType?: string;
  registrationNumber?: string;
  businessSerialNo?: string;
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

  // Populated only by authenticated owner-facing reads.
  canManage?: boolean;
  pendingHandover?: Pick<ProfileManagerHandover, "id" | "targetMemberId" | "expiresAt">;
  certificateAvailable?: boolean;

  createdAt: string;
  updatedAt: string;
}
