export interface FourGotras {
  selfGotra?: string;
  motherGotra?: string;
  dadiGotra?: string;
  naniGotra?: string;
}

export interface PartnerPreferenceDetails {
  ageRange?: string;
  heightRange?: string;
  education?: string;
  diet?: string;
  gotraExclusion?: string;
  location?: string;
  notes?: string;
}

export interface BiodataTemplateProps {
  id: string;
  fullName: string;
  gender?: string;
  dob?: string;
  age?: number | string;
  height?: string;
  weight?: string;
  complexion?: string;
  bloodGroup?: string;
  diet?: string;
  motherTongue?: string;
  languages?: string[];
  photoBase64?: string;
  photoUrl?: string;
  gotra?: string;
  fourGotras?: FourGotras;
  manglik?: string;
  rashi?: string;
  nakshatra?: string;
  charan?: string;
  tob?: string;
  pob?: string;
  highestEducation?: string;
  college?: string;
  schooling?: string;
  occupation?: string;
  company?: string;
  annualIncome?: string;
  workLocation?: string;
  fatherName?: string;
  fatherOccupation?: string;
  motherName?: string;
  motherOccupation?: string;
  siblings?: string[];
  nativePlace?: string;
  currentCity?: string;
  familyType?: string;
  familyValues?: string;
  partnerPreferences?: PartnerPreferenceDetails;
  contactPerson?: string;
  contactPhone?: string;
  secondaryPhone?: string;
  contactEmail?: string;
  residentialAddress?: string;
  verificationSeal?: string;
  footerPortalInfo?: string;
}
