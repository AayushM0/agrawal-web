export type InquiryCategory =
  | "Registration Moderation"
  | "Profile Claiming"
  | "Gotra Question"
  | "Privacy Concern"
  | "Technical Glitch"
  | "Other Issue";

export type InquiryStatus = "open" | "in_progress" | "resolved";

export interface SupportInquiry {
  id: string;
  ticketId: string;
  name: string;
  email: string;
  category: InquiryCategory | string;
  message: string;
  status: InquiryStatus;
  adminNotes?: string;
  ipAddress?: string;
  createdAt: string;
}

export interface CreateInquiryInput {
  name: string;
  email: string;
  category: string;
  message: string;
  ipAddress?: string;
}
