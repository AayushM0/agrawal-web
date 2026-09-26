export type CareerLevel =
  | "student_intern"
  | "fresher"
  | "mid_level"
  | "senior"
  | "executive"
  | "consultant";

export type PrimaryDomain =
  | "Technology & Engineering"
  | "Finance & Accounting"
  | "Manufacturing & Industrial"
  | "Retail & FMCG"
  | "Healthcare & Pharma"
  | "Legal & Compliance"
  | "Real Estate & Infrastructure"
  | "Consulting & Strategy"
  | "Marketing & Media"
  | "Other";

export type SeekingStatus =
  | "actively_looking"
  | "open_to_offers"
  | "not_looking"
  | "mentoring_only";

export type WorkplacePreference = "remote" | "hybrid" | "onsite" | "flexible";

export interface CareerProfile {
  id: string;
  householdId: string;
  memberId: string;

  headline: string;
  careerLevel: CareerLevel;
  primaryDomain: PrimaryDomain;
  currentCompany?: string;
  currentDesignation?: string;
  yearsOfExperience: number;

  educationHighest?: string;
  educationInstitution?: string;
  skills: string[];

  seekingStatus: SeekingStatus;
  preferredLocations: string[];
  workplacePreference: WorkplacePreference;

  resumeUrl?: string;
  bio?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;

  isMentorAvailable: boolean;
  isConfidentialMode: boolean;
  status: "live" | "paused" | "draft";

  createdAt?: string;
  updatedAt?: string;

  // Joined fields from member & household
  fullName?: string;
  gender?: string;
  gotra?: string;
  city?: string;
  state?: string;
  country?: string;
  nativePlace?: string;
  serialNo?: number;
  householdCode?: string;
}

export interface CreateCareerProfileInput {
  householdId: string;
  memberId: string;
  headline: string;
  careerLevel: CareerLevel;
  primaryDomain: PrimaryDomain;
  currentCompany?: string;
  currentDesignation?: string;
  yearsOfExperience?: number;
  educationHighest?: string;
  educationInstitution?: string;
  skills?: string[];
  seekingStatus?: SeekingStatus;
  preferredLocations?: string[];
  workplacePreference?: WorkplacePreference;
  resumeUrl?: string;
  bio?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  isMentorAvailable?: boolean;
  isConfidentialMode?: boolean;
}

export interface UpdateCareerProfileInput {
  headline?: string;
  careerLevel?: CareerLevel;
  primaryDomain?: PrimaryDomain;
  currentCompany?: string;
  currentDesignation?: string;
  yearsOfExperience?: number;
  educationHighest?: string;
  educationInstitution?: string;
  skills?: string[];
  seekingStatus?: SeekingStatus;
  preferredLocations?: string[];
  workplacePreference?: WorkplacePreference;
  resumeUrl?: string;
  bio?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  isMentorAvailable?: boolean;
  isConfidentialMode?: boolean;
  status?: "live" | "paused" | "draft";
}

export interface CareerFilter {
  query?: string;
  primaryDomain?: string;
  careerLevel?: string;
  gotra?: string;
  city?: string;
  skills?: string[];
  isMentorAvailable?: boolean;
  seekingStatus?: string;
  limit?: number;
  offset?: number;
}
