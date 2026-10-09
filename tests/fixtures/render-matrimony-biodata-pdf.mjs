import { renderBiodataPdf } from "../../src/lib/matrimony-pdf.ts";

const profile = {
  id: "profile-1",
  householdId: "household-1",
  memberId: "member-1",
  createdByUserId: "owner-1",
  status: "active",
  gender: "male",
  fullName: "Aarav Singhal",
  createdFor: "Self",
  maritalStatus: "Never Married",
  dob: "1995-10-14",
  placeOfBirth: "New Delhi, India",
  heightDisplay: "5' 11\" (180 cm)",
  motherTongue: "Hindi",
  languagesSpoken: ["Hindi", "English"],
  diet: "Vegetarian",
  smokeDrink: "Non-Smoker / Non-Drinker",
  physicalStatus: "Normal",
  gotra: "Singhal",
  highestEducation: "B.Tech",
  employmentSector: "Private",
  occupationTitle: "Engineer",
  workCountry: "Singapore",
  willingToRelocate: "Yes",
  fatherName: "Ramesh Singhal",
  motherName: "Sunita Singhal",
  linkedSiblings: [],
  nativePlace: "Agroha",
  familyLocation: "Singapore",
  familyType: "Nuclear",
  familyValues: "Traditional",
  familyFinancialStatus: "Upper Middle Class",
  customFields: [],
  photos: [],
  partnerPreferences: {},
  contactPerson: "Ramesh Singhal",
  contactRelation: "Father",
  contactPhone: "+65 9123 4567",
  createdAt: "2026-10-10T00:00:00.000Z",
  updatedAt: "2026-10-10T00:00:00.000Z"
};

const pdf = await renderBiodataPdf(profile);
process.stdout.write(JSON.stringify({ header: pdf.subarray(0, 5).toString("utf8"), length: pdf.length }));
process.exit(0);
