'use server';

import { db } from "@/lib/db";
import { getSession } from "@/actions/auth";
import type {
  CareerProfile,
  CreateCareerProfileInput,
  UpdateCareerProfileInput,
  CareerFilter,
  JobPosting,
  CreateJobPostingInput,
  JobApplication,
} from "@/types/career";

/**
 * Sanitize candidate profile for public display, masking confidential details.
 */
function sanitizeCareerProfile(profile: CareerProfile): CareerProfile {
  return {
    ...profile,
    // Confidential Mode: mask current company if requested by the candidate
    currentCompany: profile.isConfidentialMode ? "Confidential Enterprise" : profile.currentCompany,
    skills: Array.isArray(profile.skills) ? profile.skills : [],
    preferredLocations: Array.isArray(profile.preferredLocations) ? profile.preferredLocations : [],
  };
}

/**
 * Create or update an individual member's career profile.
 */
export async function createCareerProfileAction(input: CreateCareerProfileInput): Promise<{
  success: boolean;
  profile?: CareerProfile;
  error?: string;
}> {
  const session = await getSession();
  if (!session || !session.userId) {
    return { success: false, error: "Please log in to build a career profile." };
  }

  if (session.householdStatus !== "live") {
    return { success: false, error: "Your household registration is pending administrative approval." };
  }

  try {
    const household = await db.getHouseholdByContact(session.contact);
    if (!household || !household.id) {
      return { success: false, error: "Unable to locate verified household record." };
    }

    const memberId = input.memberId?.trim();
    if (!memberId) {
      return { success: false, error: "Please select a household member for this profile." };
    }

    // Verify selected member belongs to this household
    const member = household.members?.find((m: any) => m.id === memberId);
    if (!member) {
      return { success: false, error: "The selected member does not belong to your household." };
    }

    // Validations
    const headline = input.headline?.trim();
    if (!headline || headline.length < 5) {
      return { success: false, error: "Professional headline must be at least 5 characters." };
    }

    if (!input.primaryDomain?.trim()) {
      return { success: false, error: "Please select your primary industry domain." };
    }

    if (!input.careerLevel?.trim()) {
      return { success: false, error: "Please select your career seniority level." };
    }

    const cleanSkills = Array.isArray(input.skills)
      ? input.skills.map((s) => s.trim()).filter(Boolean)
      : [];

    const cleanLocations = Array.isArray(input.preferredLocations)
      ? input.preferredLocations.map((l) => l.trim()).filter(Boolean)
      : [];

    const created = await db.createCareerProfile({
      householdId: household.id,
      memberId,
      headline,
      careerLevel: input.careerLevel,
      primaryDomain: input.primaryDomain,
      currentCompany: input.currentCompany?.trim() || undefined,
      currentDesignation: input.currentDesignation?.trim() || undefined,
      yearsOfExperience: typeof input.yearsOfExperience === "number" ? Math.max(0, input.yearsOfExperience) : 0,
      educationHighest: input.educationHighest?.trim() || undefined,
      educationInstitution: input.educationInstitution?.trim() || undefined,
      skills: cleanSkills,
      seekingStatus: input.seekingStatus || "open_to_offers",
      preferredLocations: cleanLocations,
      workplacePreference: input.workplacePreference || "flexible",
      resumeUrl: input.resumeUrl?.trim() || undefined,
      bio: input.bio?.trim() || undefined,
      linkedinUrl: input.linkedinUrl?.trim() || undefined,
      portfolioUrl: input.portfolioUrl?.trim() || undefined,
      isMentorAvailable: Boolean(input.isMentorAvailable),
      isConfidentialMode: Boolean(input.isConfidentialMode),
    });

    return {
      success: true,
      profile: sanitizeCareerProfile(created),
    };
  } catch (err: any) {
    console.error("[CAREER ACTION ERROR] createCareerProfileAction:", err);
    return { success: false, error: err.message || "Failed to create career profile." };
  }
}

/**
 * Fetch a single career profile by its ID.
 */
export async function getCareerProfileByIdAction(id: string): Promise<{
  success: boolean;
  profile?: CareerProfile;
  error?: string;
}> {
  try {
    const profile = await db.getCareerProfileById(id);
    if (!profile) {
      return { success: false, error: "Career profile not found." };
    }
    return {
      success: true,
      profile: sanitizeCareerProfile(profile),
    };
  } catch (err: any) {
    console.error("[CAREER ACTION ERROR] getCareerProfileByIdAction:", err);
    return { success: false, error: "Failed to fetch career profile." };
  }
}

/**
 * Fetch a career profile by member ID.
 */
export async function getCareerProfileByMemberIdAction(memberId: string): Promise<{
  success: boolean;
  profile?: CareerProfile | null;
  error?: string;
}> {
  try {
    const profile = await db.getCareerProfileByMemberId(memberId);
    return {
      success: true,
      profile: profile ? sanitizeCareerProfile(profile) : null,
    };
  } catch (err: any) {
    console.error("[CAREER ACTION ERROR] getCareerProfileByMemberIdAction:", err);
    return { success: false, error: "Failed to fetch career profile by member." };
  }
}

/**
 * Fetch public live career profiles matching filters.
 */
export async function getLiveCareerProfilesAction(filter: CareerFilter = {}): Promise<{
  success: boolean;
  profiles: CareerProfile[];
  total: number;
  error?: string;
}> {
  try {
    const { profiles, total } = await db.getLiveCareerProfiles(filter);
    return {
      success: true,
      profiles: profiles.map(sanitizeCareerProfile),
      total,
    };
  } catch (err: any) {
    console.error("[CAREER ACTION ERROR] getLiveCareerProfilesAction:", err);
    return { success: false, profiles: [], total: 0, error: "Failed to fetch live career profiles." };
  }
}

/**
 * Update an existing career profile.
 */
export async function updateCareerProfileAction(
  id: string,
  updates: UpdateCareerProfileInput
): Promise<{ success: boolean; profile?: CareerProfile; error?: string }> {
  const session = await getSession();
  if (!session || !session.userId) {
    return { success: false, error: "Please log in to edit your profile." };
  }

  try {
    const existing = await db.getCareerProfileById(id);
    if (!existing) {
      return { success: false, error: "Career profile not found." };
    }

    const household = await db.getHouseholdByContact(session.contact);
    if (!household || household.id !== existing.householdId) {
      return { success: false, error: "You are not authorized to edit this profile." };
    }

    const updated = await db.updateCareerProfile(id, updates);
    return {
      success: true,
      profile: updated ? sanitizeCareerProfile(updated) : undefined,
    };
  } catch (err: any) {
    console.error("[CAREER ACTION ERROR] updateCareerProfileAction:", err);
    return { success: false, error: err.message || "Failed to update profile." };
  }
}

/**
 * Toggle visibility of a career profile between live and paused.
 */
export async function toggleCareerProfileVisibilityAction(id: string): Promise<{
  success: boolean;
  newStatus?: "live" | "paused";
  error?: string;
}> {
  const session = await getSession();
  if (!session || !session.userId) {
    return { success: false, error: "Unauthorized." };
  }

  try {
    const existing = await db.getCareerProfileById(id);
    if (!existing) {
      return { success: false, error: "Profile not found." };
    }

    const household = await db.getHouseholdByContact(session.contact);
    if (!household || household.id !== existing.householdId) {
      return { success: false, error: "Unauthorized." };
    }

    const nextStatus = existing.status === "live" ? "paused" : "live";
    await db.updateCareerProfile(id, { status: nextStatus });
    return { success: true, newStatus: nextStatus };
  } catch (err: any) {
    console.error("[CAREER ACTION ERROR] toggleCareerProfileVisibilityAction:", err);
    return { success: false, error: "Failed to toggle profile visibility." };
  }
}

/**
 * Delete a career profile.
 */
export async function deleteCareerProfileAction(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const session = await getSession();
  if (!session || !session.userId) {
    return { success: false, error: "Unauthorized." };
  }

  try {
    const existing = await db.getCareerProfileById(id);
    if (!existing) {
      return { success: false, error: "Profile not found." };
    }

    const household = await db.getHouseholdByContact(session.contact);
    if (!household || household.id !== existing.householdId) {
      return { success: false, error: "Unauthorized." };
    }

    const deleted = await db.deleteCareerProfile(id);
    return { success: deleted };
  } catch (err: any) {
    console.error("[CAREER ACTION ERROR] deleteCareerProfileAction:", err);
    return { success: false, error: "Failed to delete profile." };
  }
}

/**
 * Post a new job opportunity by a verified household or enterprise.
 */
export async function createJobPostingAction(input: CreateJobPostingInput): Promise<{
  success: boolean;
  job?: JobPosting;
  error?: string;
}> {
  const session = await getSession();
  if (!session || !session.userId) {
    return { success: false, error: "Please log in to post a job opportunity." };
  }

  if (session.householdStatus !== "live") {
    return { success: false, error: "Your household registration is pending administrative approval." };
  }

  try {
    const household = await db.getHouseholdByContact(session.contact);
    if (!household || !household.id) {
      return { success: false, error: "Unable to locate verified household record." };
    }

    const postedByMemberId = input.postedByMemberId?.trim();
    if (!postedByMemberId) {
      return { success: false, error: "Please select the member posting this opportunity." };
    }

    const member = household.members?.find((m: any) => m.id === postedByMemberId);
    if (!member) {
      return { success: false, error: "The selected member does not belong to your household." };
    }

    const title = input.title?.trim();
    if (!title || title.length < 3) {
      return { success: false, error: "Job title must be at least 3 characters." };
    }

    const companyName = input.companyName?.trim();
    if (!companyName || companyName.length < 2) {
      return { success: false, error: "Company name must be at least 2 characters." };
    }

    if (!input.industry?.trim()) {
      return { success: false, error: "Please select an industry sector." };
    }

    if (!input.jobType?.trim()) {
      return { success: false, error: "Please select employment type." };
    }

    if (!input.workplaceType?.trim()) {
      return { success: false, error: "Please select workplace format." };
    }

    const description = input.description?.trim();
    if (!description || description.length < 10) {
      return { success: false, error: "Job description must be at least 10 characters." };
    }

    const skillsRequired = Array.isArray(input.skillsRequired)
      ? input.skillsRequired.map((s) => s.trim()).filter(Boolean)
      : [];

    const job = await db.createJobPosting({
      householdId: household.id,
      businessId: input.businessId?.trim() || undefined,
      postedByMemberId,
      title,
      companyName,
      industry: input.industry.trim(),
      jobType: input.jobType,
      workplaceType: input.workplaceType,
      city: input.city?.trim() || undefined,
      country: input.country?.trim() || "India",
      experienceMin: typeof input.experienceMin === "number" ? Math.max(0, input.experienceMin) : 0,
      experienceMax: typeof input.experienceMax === "number" ? input.experienceMax : undefined,
      salaryRange: input.salaryRange?.trim() || undefined,
      description,
      requirements: input.requirements?.trim() || undefined,
      skillsRequired,
    });

    return { success: true, job };
  } catch (err: any) {
    console.error("[CAREER ACTION ERROR] createJobPostingAction:", err);
    return { success: false, error: err.message || "Failed to create job posting." };
  }
}

/**
 * Fetch live active job postings matching filters.
 */
export async function getLiveJobPostingsAction(filter: {
  industry?: string;
  jobType?: string;
  workplaceType?: string;
  query?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<{
  success: boolean;
  jobs: JobPosting[];
  total: number;
  error?: string;
}> {
  try {
    const { jobs, total } = await db.getLiveJobPostings(filter);
    return { success: true, jobs, total };
  } catch (err: any) {
    console.error("[CAREER ACTION ERROR] getLiveJobPostingsAction:", err);
    return { success: false, jobs: [], total: 0, error: "Failed to fetch job postings." };
  }
}

/**
 * Fetch a single job posting by ID, including application state if user is logged in.
 */
export async function getJobPostingByIdAction(id: string): Promise<{
  success: boolean;
  job?: JobPosting;
  hasApplied?: boolean;
  error?: string;
}> {
  try {
    const job = await db.getJobPostingById(id);
    if (!job) {
      return { success: false, error: "Job opening not found." };
    }

    let hasApplied = false;
    const session = await getSession();
    if (session && session.userId) {
      const household = await db.getHouseholdByContact(session.contact);
      if (household && household.members) {
        for (const m of household.members) {
          const applied = await db.hasMemberApplied(id, m.id);
          if (applied) {
            hasApplied = true;
            break;
          }
        }
      }
    }

    return { success: true, job, hasApplied };
  } catch (err: any) {
    console.error("[CAREER ACTION ERROR] getJobPostingByIdAction:", err);
    return { success: false, error: "Failed to fetch job details." };
  }
}

/**
 * 1-Click apply to an active job opening using verified community career profile.
 */
export async function applyForJobAction(
  jobPostingId: string,
  applicantMemberId: string,
  coverNote?: string
): Promise<{
  success: boolean;
  application?: JobApplication;
  error?: string;
}> {
  const session = await getSession();
  if (!session || !session.userId) {
    return { success: false, error: "Please log in to apply for job opportunities." };
  }

  if (session.householdStatus !== "live") {
    return { success: false, error: "Your household registration is pending administrative approval." };
  }

  try {
    const household = await db.getHouseholdByContact(session.contact);
    if (!household || !household.id) {
      return { success: false, error: "Unable to locate verified household record." };
    }

    const member = household.members?.find((m: any) => m.id === applicantMemberId);
    if (!member) {
      return { success: false, error: "Selected member does not belong to your verified household." };
    }

    const job = await db.getJobPostingById(jobPostingId);
    if (!job || job.status !== "active") {
      return { success: false, error: "This job opportunity is no longer accepting applications." };
    }

    // Check if applicant has a career profile
    const profile = await db.getCareerProfileByMemberId(applicantMemberId);
    if (!profile) {
      return {
        success: false,
        error: "Please create your Agarwal Career Profile before applying for jobs.",
      };
    }

    // Check if already applied
    const alreadyApplied = await db.hasMemberApplied(jobPostingId, applicantMemberId);
    if (alreadyApplied) {
      return { success: false, error: "You have already applied for this opening." };
    }

    const application = await db.createJobApplication({
      jobPostingId,
      applicantMemberId,
      careerProfileId: profile.id,
      coverNote: coverNote?.trim() || undefined,
    });

    return { success: true, application };
  } catch (err: any) {
    console.error("[CAREER ACTION ERROR] applyForJobAction:", err);
    return { success: false, error: err.message || "Failed to submit job application." };
  }
}

/**
 * Get applications received for a job posting (for employer / poster).
 */
export async function getJobApplicationsByPostingAction(jobPostingId: string): Promise<{
  success: boolean;
  applications: JobApplication[];
  error?: string;
}> {
  const session = await getSession();
  if (!session || !session.userId) {
    return { success: false, applications: [], error: "Unauthorized." };
  }

  try {
    const job = await db.getJobPostingById(jobPostingId);
    if (!job) {
      return { success: false, applications: [], error: "Job posting not found." };
    }

    const household = await db.getHouseholdByContact(session.contact);
    if (!household || household.id !== job.householdId) {
      return { success: false, applications: [], error: "Unauthorized to view these applications." };
    }

    const applications = await db.getJobApplicationsByPosting(jobPostingId);
    return { success: true, applications };
  } catch (err: any) {
    console.error("[CAREER ACTION ERROR] getJobApplicationsByPostingAction:", err);
    return { success: false, applications: [], error: "Failed to fetch applications." };
  }
}

/**
 * Get job applications submitted by the current user's household.
 */
export async function getMyHouseholdApplicationsAction(): Promise<{
  success: boolean;
  applications: JobApplication[];
  error?: string;
}> {
  const session = await getSession();
  if (!session || !session.userId) {
    return { success: false, applications: [], error: "Unauthorized." };
  }

  try {
    const household = await db.getHouseholdByContact(session.contact);
    if (!household || !household.members) {
      return { success: false, applications: [], error: "Household not found." };
    }

    const allApps: JobApplication[] = [];
    for (const m of household.members) {
      const apps = await db.getJobApplicationsByApplicant(m.id);
      allApps.push(...apps);
    }

    return { success: true, applications: allApps };
  } catch (err: any) {
    console.error("[CAREER ACTION ERROR] getMyHouseholdApplicationsAction:", err);
    return { success: false, applications: [], error: "Failed to fetch applications." };
  }
}

/**
 * Get job postings created by the current user's household.
 */
export async function getMyHouseholdJobPostingsAction(): Promise<{
  success: boolean;
  jobs: JobPosting[];
  error?: string;
}> {
  const session = await getSession();
  if (!session || !session.userId) {
    return { success: false, jobs: [], error: "Unauthorized." };
  }

  try {
    const household = await db.getHouseholdByContact(session.contact);
    if (!household) {
      return { success: false, jobs: [], error: "Household not found." };
    }

    const jobs = await db.getJobPostingsByHousehold(household.id);
    return { success: true, jobs };
  } catch (err: any) {
    console.error("[CAREER ACTION ERROR] getMyHouseholdJobPostingsAction:", err);
    return { success: false, jobs: [], error: "Failed to fetch posted jobs." };
  }
}

