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

export type JobType = "full_time" | "internship" | "part_time" | "contract" | "advisory";
export type WorkplaceType = "remote" | "hybrid" | "on_site";

export interface JobPosting {
  id: string;
  householdId: string;
  businessId?: string;
  postedByMemberId: string;
  title: string;
  companyName: string;
  industry: string;
  jobType: JobType;
  workplaceType: WorkplaceType;
  city?: string;
  country: string;
  experienceMin: number;
  experienceMax?: number;
  salaryRange?: string;
  description: string;
  requirements?: string;
  skillsRequired: string[];
  status: "active" | "paused" | "closed";
  createdAt?: string;
  updatedAt?: string;
  applicantCount?: number;
  isVerifiedEnterprise?: boolean;
}

export interface CreateJobPostingInput {
  householdId: string;
  businessId?: string;
  postedByMemberId: string;
  title: string;
  companyName: string;
  industry: string;
  jobType: JobType;
  workplaceType: WorkplaceType;
  city?: string;
  country?: string;
  experienceMin?: number;
  experienceMax?: number;
  salaryRange?: string;
  description: string;
  requirements?: string;
  skillsRequired?: string[];
}

export interface JobApplication {
  id: string;
  jobPostingId: string;
  applicantMemberId: string;
  careerProfileId: string;
  coverNote?: string;
  status: "submitted" | "reviewed" | "shortlisted" | "declined";
  createdAt?: string;
  updatedAt?: string;
  applicantName?: string;
  applicantHeadline?: string;
  applicantResumeUrl?: string;
}

