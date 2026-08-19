import type { Member, Household } from "../types/household";

export const initialMockHouseholds: Household[] = [
  {
    id: "h-101",
    householdCode: "AGR-2026-101",
    headUserId: "u-101",
    headName: "Rajesh Kumar Garg",
    nativePlace: "Agroha, Hisar, Haryana",
    gotra: "Garg",
    status: "live",
    verifiedContact: "+91 98765 43210",
    createdAt: "2026-08-10T10:00:00Z",
    members: [
      {
        id: "m-101",
        fullName: "Rajesh Kumar Garg",
        relationToHead: "self",
        dob: "1978-05-14",
        gender: "Male",
        maritalStatus: "Married",
        currentCity: "New Delhi",
        currentCountry: "India",
        profession: "Chartered Accountant & Financial Advisor",
        phone: "+91 98765 43210",
        email: "rajesh.garg@example.com",
        bio: "Senior partner at Garg & Associates with 20+ years of corporate tax and advisory experience. Active in community seva.",
        verifiedBySelf: true,
        ownerLocked: true,
        visibility: {
          contactInfo: "members_only",
          dob: "hidden",
          photo: "public_to_members"
        }
      },
      {
        id: "m-102",
        fullName: "Sunita Garg",
        relationToHead: "spouse",
        dob: "1982-08-20",
        gender: "Female",
        maritalStatus: "Married",
        currentCity: "New Delhi",
        currentCountry: "India",
        profession: "Senior Educator & Philanthropist",
        verifiedBySelf: false,
        ownerLocked: false,
        visibility: {
          contactInfo: "members_only",
          dob: "hidden",
          photo: "public_to_members"
        }
      },
      {
        id: "m-103",
        fullName: "Aayush Garg",
        relationToHead: "son",
        dob: "2002-11-05",
        gender: "Male",
        maritalStatus: "Unmarried",
        currentCity: "Bengaluru",
        currentCountry: "India",
        profession: "Software Engineer & AI Researcher",
        phone: "+91 98111 22334",
        email: "aayush.garg@tech.io",
        bio: "Building distributed systems and agentic AI. Passionate about community youth empowerment.",
        verifiedBySelf: true,
        ownerLocked: true,
        visibility: {
          contactInfo: "members_only",
          dob: "hidden",
          photo: "public_to_members"
        }
      }
    ]
  },
  {
    id: "h-102",
    householdCode: "AGR-2026-102",
    headUserId: "u-102",
    headName: "Vikram Jindal",
    nativePlace: "Hisar, Haryana",
    gotra: "Jindal",
    status: "live",
    verifiedContact: "+65 8765 4321",
    createdAt: "2026-08-12T14:30:00Z",
    members: [
      {
        id: "m-201",
        fullName: "Vikram Jindal",
        relationToHead: "self",
        dob: "1972-03-25",
        gender: "Male",
        maritalStatus: "Married",
        currentCity: "Singapore",
        currentCountry: "Singapore",
        profession: "Managing Director — International Steel & Commodities",
        phone: "+65 8765 4321",
        email: "vikram.jindal@globalmetals.sg",
        bio: "Leading international trade across Southeast Asia and India. Coordinator for Global Agrawal Chapters.",
        verifiedBySelf: true,
        ownerLocked: true,
        visibility: {
          contactInfo: "members_only",
          dob: "hidden",
          photo: "public_to_members"
        }
      },
      {
        id: "m-202",
        fullName: "Pooja Jindal",
        relationToHead: "spouse",
        dob: "1976-09-12",
        gender: "Female",
        maritalStatus: "Married",
        currentCity: "Singapore",
        currentCountry: "Singapore",
        profession: "Architectural Interior Consultant",
        verifiedBySelf: true,
        ownerLocked: true,
        visibility: {
          contactInfo: "members_only",
          dob: "hidden",
          photo: "public_to_members"
        }
      }
    ]
  },
  {
    id: "h-103",
    householdCode: "AGR-2026-103",
    headUserId: "u-103",
    headName: "Anil Bansal",
    nativePlace: "Jaipur, Rajasthan",
    gotra: "Bansal",
    status: "live",
    verifiedContact: "+91 98290 12345",
    createdAt: "2026-08-15T09:15:00Z",
    members: [
      {
        id: "m-301",
        fullName: "Anil Bansal",
        relationToHead: "self",
        dob: "1968-12-02",
        gender: "Male",
        maritalStatus: "Married",
        currentCity: "Jaipur",
        currentCountry: "India",
        profession: "Jewellery Manufacturer & Exporter",
        phone: "+91 98290 12345",
        bio: "Heritage gemstone craftsmanship and global jewelry trade.",
        verifiedBySelf: true,
        ownerLocked: true,
        visibility: {
          contactInfo: "members_only",
          dob: "hidden",
          photo: "public_to_members"
        }
      }
    ]
  },
  {
    id: "h-104",
    householdCode: "AGR-2026-104",
    headUserId: "u-104",
    headName: "Deepak Mittal",
    nativePlace: "Bhiwani, Haryana",
    gotra: "Mittal",
    status: "pending_review",
    verifiedContact: "+971 50 123 4567",
    createdAt: "2026-08-19T08:00:00Z",
    members: [
      {
        id: "m-401",
        fullName: "Deepak Mittal",
        relationToHead: "self",
        dob: "1985-07-18",
        gender: "Male",
        maritalStatus: "Married",
        currentCity: "Dubai",
        currentCountry: "UAE",
        profession: "Fintech Venture Capitalist",
        phone: "+971 50 123 4567",
        verifiedBySelf: true,
        ownerLocked: true,
        visibility: {
          contactInfo: "members_only",
          dob: "hidden",
          photo: "public_to_members"
        }
      }
    ]
  }
];

export const allMockMembers = initialMockHouseholds.flatMap((h) =>
  h.members.map((m) => ({
    ...m,
    householdCode: h.householdCode,
    gotra: h.gotra,
    nativePlace: h.nativePlace,
    householdStatus: h.status
  }))
);