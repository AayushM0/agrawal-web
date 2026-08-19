export type VisibilityOption = "public_to_members" | "members_only" | "hidden";

export interface FieldVisibility {
  contactInfo: "members_only" | "hidden";
  dob: "members_only" | "hidden";
  photo: "public_to_members" | "hidden";
}

export interface Member {
  id: string;
  fullName: string;
  relationToHead: "self" | "spouse" | "son" | "daughter" | "parent" | "other";
  dob: string;
  gender: string;
  maritalStatus: string;
  currentCity: string;
  currentCountry: string;
  profession: string;
  phone?: string;
  email?: string;
  photoUrl?: string;
  bio?: string;
  verifiedBySelf: boolean;
  ownerLocked: boolean;
  visibility: FieldVisibility;
}

export interface Household {
  id: string;
  householdCode: string;
  headUserId: string;
  headName: string;
  nativePlace: string;
  gotra: string;
  status: "pending_review" | "live" | "rejected";
  rejectionReason?: string;
  consentAcceptedAt?: string;
  verifiedContact: string;
  createdAt: string;
  members: Member[];
}