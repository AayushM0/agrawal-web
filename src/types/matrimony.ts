export interface LinkedFamilyMember {
  name: string;
  relation: "father" | "mother" | "brother" | "sister" | "other";
  relationLabel?: string;
  occupation?: string;
  maritalStatus?: "married" | "unmarried" | "other";
  memberId?: string; // UUID of linked member in community directory
  serialNo?: string;
}

export interface CustomField {
  id: string;
  label: string;
  value: string;
}

export interface PartnerPreferences {
  minAge?: number;
  maxAge?: number;
  minHeightCm?: number;
  maxHeightCm?: number;
  maritalStatus?: string[];
  education?: string[];
  employmentSector?: string[];
  preferredLocations?: string[];
  diet?: string[];
  notes?: string;
}

export interface MatrimonialProfile {
  id: string;
  householdId: string;
  memberId: string;
  createdByUserId: string;
  status: "active" | "paused" | "matched" | "hidden";
  gender: "male" | "female";
  fullName: string;
  createdFor: "Self" | "Son" | "Daughter" | "Brother" | "Sister" | "Relative" | "Guardian";
  maritalStatus: "Never Married" | "Divorced" | "Widowed" | "Awaiting Divorce" | "Annulled";
  dob: string;
  placeOfBirth?: string;
  heightCm?: number;
  heightDisplay?: string; // e.g. 5' 9" (175 cm)
  weightBuild?: string; // e.g. Slim, Athletic, Average, Heavy
  complexion?: string; // Fair, Very Fair, Wheatish, Dusky
  bloodGroup?: string;
  motherTongue: string;
  languagesSpoken: string[];
  diet: string;
  smokeDrink: string;
  physicalStatus: string; // Normal, Physically Challenged, etc.
  aboutMe?: string;

  // Gotra (inherited canonical Agarwal Gotra)
  gotra: string;

  // Education & Career
  highestEducation: string;
  degreeName?: string;
  collegeName?: string;
  schoolingHonors?: string;
  employmentSector: string; // Private, Business, Govt, Defense, etc.
  occupationTitle: string;
  companyName?: string;
  annualIncome?: string;
  workCity?: string;
  workCountry: string;
  willingToRelocate: string;

  // Family Details
  fatherName: string;
  fatherMemberId?: string;
  fatherOccupation?: string;
  motherName: string;
  motherMemberId?: string;
  motherOccupation?: string;
  linkedSiblings: LinkedFamilyMember[];
  nativePlace: string;
  familyLocation: string;
  familyType: "Nuclear" | "Joint";
  familyValues: "Traditional" | "Moderate" | "Liberal";
  familyFinancialStatus: string;
  aboutFamily?: string;

  // Dynamic Custom Fields & Photos
  customFields: CustomField[];
  photos: string[]; // 1 to 3 photos (base64 data URIs or optimized URLs)

  // Partner Preferences & Contact
  partnerPreferences: PartnerPreferences;
  contactPerson: string;
  contactRelation: string;
  contactPhone: string;
  secondaryPhone?: string;
  contactEmail?: string;
  residentialAddress?: string;

  createdAt: string;
  updatedAt: string;

  // Resolved virtuals for display
  age?: number;
  fatherMemberSerial?: string;
  motherMemberSerial?: string;
}

export interface MatrimonyFilter {
  gender?: "male" | "female" | "all";
  name?: string;
  gotra?: string;
  location?: string;
  minAge?: number;
  maxAge?: number;
  minHeightCm?: number;
  maxHeightCm?: number;
  highestEducation?: string;
  employmentSector?: string;
  maritalStatus?: string;
  nativePlace?: string;
  page?: number;
  limit?: number;
}

export interface CreateMatrimonialProfileInput {
  memberId: string;
  createdFor: "Self" | "Son" | "Daughter" | "Brother" | "Sister" | "Relative" | "Guardian";
  maritalStatus: "Never Married" | "Divorced" | "Widowed" | "Awaiting Divorce" | "Annulled";
  dob: string;
  placeOfBirth?: string;
  heightCm?: number;
  heightDisplay?: string;
  weightBuild?: string;
  complexion?: string;
  bloodGroup?: string;
  motherTongue?: string;
  languagesSpoken?: string[];
  diet?: string;
  smokeDrink?: string;
  physicalStatus?: string;
  aboutMe?: string;

  highestEducation: string;
  degreeName?: string;
  collegeName?: string;
  schoolingHonors?: string;
  employmentSector: string;
  occupationTitle: string;
  companyName?: string;
  annualIncome?: string;
  workCity?: string;
  workCountry?: string;
  willingToRelocate?: string;

  fatherName: string;
  fatherMemberId?: string;
  fatherOccupation?: string;
  motherName: string;
  motherMemberId?: string;
  motherOccupation?: string;
  linkedSiblings?: LinkedFamilyMember[];
  nativePlace?: string;
  familyLocation?: string;
  familyType?: "Nuclear" | "Joint";
  familyValues?: "Traditional" | "Moderate" | "Liberal";
  familyFinancialStatus?: string;
  aboutFamily?: string;

  customFields?: CustomField[];
  photos: string[];

  partnerPreferences?: PartnerPreferences;
  contactPerson: string;
  contactRelation: string;
  contactPhone: string;
  secondaryPhone?: string;
  contactEmail?: string;
  residentialAddress?: string;
}

export interface EligibleHouseholdMember {
  id: string;
  fullName: string;
  relationToHead: string;
  gender: string;
  dob: string;
  maritalStatus: string;
  currentCity: string;
  currentCountry: string;
  profession: string;
  professionTitle?: string;
  companyName?: string;
  phone?: string;
  email?: string;
  photoUrl?: string;
  serialNo?: string;
  hasMatrimonialProfile: boolean;
  matrimonialProfileId?: string;
  matrimonialProfileStatus?: string;
}
