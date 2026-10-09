import fs from "node:fs";
import path from "node:path";
import type { BiodataTemplateProps, FourGotras } from "@/types/matrimony-biodata";

const fontPath = (name: string) => path.join(process.cwd(), "public", "fonts", name);
const fontBase64 = (name: string) => fs.readFileSync(fontPath(name)).toString("base64");
const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>\"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[char] ?? char);
const present = (value: unknown) => value !== undefined && value !== null && String(value).trim() !== "";

const row = (label: string, value?: unknown) => present(value) ? `<div class="row"><b>${escapeHtml(label)}</b><span>${escapeHtml(value)}</span></div>` : "";
const section = (title: string, body: string) => body.trim() ? `<section class="card"><h2>${escapeHtml(title)}</h2><div class="grid">${body}</div></section>` : "";
const gotraBadge = (label: string, value?: string) => present(value) ? `<div class="gotra"><small>${escapeHtml(label)}</small><strong>${escapeHtml(value)}</strong></div>` : "";
const DANGEROUS_BLOCKS_REGEX = /<(?:script|style|iframe|object|embed|applet)[^>]*>[\s\S]*?<\/(?:script|style|iframe|object|embed|applet)>/gi;
const DANGEROUS_TAGS_REGEX = /<\/?(?:script|style|iframe|object|embed|link|applet|meta|base)[^>]*>/gi;
const DANGEROUS_SCHEMES_REGEX = /^(?:javascript|vbscript|file|data:(?!image\/(?:png|jpe?g|webp|gif);base64,)):/i;

function sanitizeString(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  const str = String(value);
  let cleaned = str.replace(DANGEROUS_BLOCKS_REGEX, "").replace(DANGEROUS_TAGS_REGEX, "");
  if (DANGEROUS_SCHEMES_REGEX.test(cleaned.trim())) {
    cleaned = "";
  }
  return cleaned;
}

export function sanitizeBiodataInput(raw: any): BiodataTemplateProps {
  const base = normalizeProfileToBiodataProps(raw);
  const sanitize = (val: any) => typeof val === "string" ? sanitizeString(val) : val;
  const sanitizeArray = (arr?: any[]) => Array.isArray(arr) ? arr.map(sanitize).filter(Boolean) : undefined;

  const sanitized: BiodataTemplateProps = {
    ...base,
    fullName: sanitize(base.fullName) || "Candidate",
    id: sanitize(base.id) || "MAFL/MAT/PENDING",
    gender: sanitize(base.gender),
    dob: sanitize(base.dob),
    age: sanitize(base.age),
    height: sanitize(base.height),
    weight: sanitize(base.weight),
    complexion: sanitize(base.complexion),
    bloodGroup: sanitize(base.bloodGroup),
    diet: sanitize(base.diet),
    motherTongue: sanitize(base.motherTongue),
    languages: sanitizeArray(base.languages),
    aboutMe: sanitize(base.aboutMe),
    gotra: sanitize(base.gotra),
    manglik: sanitize(base.manglik),
    rashi: sanitize(base.rashi),
    nakshatra: sanitize(base.nakshatra),
    charan: sanitize(base.charan),
    tob: sanitize(base.tob),
    pob: sanitize(base.pob),
    highestEducation: sanitize(base.highestEducation),
    college: sanitize(base.college),
    schooling: sanitize(base.schooling),
    occupation: sanitize(base.occupation),
    company: sanitize(base.company),
    annualIncome: sanitize(base.annualIncome),
    workLocation: sanitize(base.workLocation),
    fatherName: sanitize(base.fatherName),
    fatherOccupation: sanitize(base.fatherOccupation),
    motherName: sanitize(base.motherName),
    motherOccupation: sanitize(base.motherOccupation),
    siblings: sanitizeArray(base.siblings),
    nativePlace: sanitize(base.nativePlace),
    currentCity: sanitize(base.currentCity),
    familyType: sanitize(base.familyType),
    familyValues: sanitize(base.familyValues),
    contactPerson: sanitize(base.contactPerson),
    contactPhone: sanitize(base.contactPhone),
    secondaryPhone: sanitize(base.secondaryPhone),
    contactEmail: sanitize(base.contactEmail),
    residentialAddress: sanitize(base.residentialAddress),
    verificationSeal: sanitize(base.verificationSeal),
    footerPortalInfo: sanitize(base.footerPortalInfo),
  };

  if (sanitized.photoUrl && DANGEROUS_SCHEMES_REGEX.test(sanitized.photoUrl.trim())) {
    sanitized.photoUrl = undefined;
  }
  if (sanitized.photoBase64 && DANGEROUS_SCHEMES_REGEX.test(sanitized.photoBase64.trim())) {
    sanitized.photoBase64 = undefined;
  }

  return sanitized;
}

export function compileBiodataHtml(inputData: BiodataTemplateProps): string {
  const data = sanitizeBiodataInput(inputData);
  const regular = fontBase64("NotoSansDevanagari-Regular.ttf");
  const bold = fontBase64("NotoSansDevanagari-Bold.ttf");
  const gotras: FourGotras = data.fourGotras ?? { selfGotra: data.gotra };
  const photo = data.photoBase64 || data.photoUrl;
  const photoHtml = present(photo) ? `<img class="photo" src="${escapeHtml(photo)}" alt="${escapeHtml(data.fullName)}" />` : "";
  const preferences = data.partnerPreferences ? [
    data.partnerPreferences.notes,
    data.partnerPreferences.ageRange && `Age: ${data.partnerPreferences.ageRange}`,
    data.partnerPreferences.heightRange && `Height: ${data.partnerPreferences.heightRange}`,
    data.partnerPreferences.education,
    data.partnerPreferences.diet,
    data.partnerPreferences.gotraExclusion && `Gotra: ${data.partnerPreferences.gotraExclusion}`,
    data.partnerPreferences.location,
  ].filter(Boolean).join(" • ") : "";
  const siblingText = Array.isArray(data.siblings) ? data.siblings.filter(Boolean).join("; ") : "";
  const personal = [row("Date of birth", data.dob), row("Age", data.age), row("Height", data.height), row("Weight", data.weight), row("Complexion", data.complexion), row("Blood group", data.bloodGroup), row("Diet", data.diet), row("Mother tongue", data.motherTongue), row("Languages", data.languages?.filter(Boolean).join(", "))].join("");
  const astrology = [row("Manglik", data.manglik), row("Rashi", data.rashi), row("Nakshatra", data.nakshatra), row("Charan", data.charan), row("Time of birth", data.tob), row("Place of birth", data.pob)].join("");
  const education = [row("Highest education", data.highestEducation), row("College", data.college), row("Schooling", data.schooling), row("Occupation", data.occupation), row("Company", data.company), row("Annual income", data.annualIncome), row("Work location", data.workLocation)].join("");
  const family = [row("Father", [data.fatherName, data.fatherOccupation].filter(Boolean).join(" — ")), row("Mother", [data.motherName, data.motherOccupation].filter(Boolean).join(" — ")), row("Siblings", siblingText), row("Native place", data.nativePlace), row("Current city", data.currentCity), row("Family type", data.familyType), row("Family values", data.familyValues)].join("");
  const contact = [row("Partner preferences", preferences), row("Contact person", data.contactPerson), row("Phone", data.contactPhone), row("Secondary phone", data.secondaryPhone), row("Email", data.contactEmail), row("Address", data.residentialAddress)].join("");
  const gotraBadges = [gotraBadge("Self / Father", gotras.selfGotra ?? data.gotra), gotraBadge("Nanihal / Mother", gotras.motherGotra), gotraBadge("दादी / Dadi", gotras.dadiGotra), gotraBadge("नानी / Nani", gotras.naniGotra)].join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>
@font-face{font-family:NotoDevanagari;src:url(data:font/ttf;base64,${regular}) format('truetype');font-weight:400}@font-face{font-family:NotoDevanagari;src:url(data:font/ttf;base64,${bold}) format('truetype');font-weight:700}
@page { size: A4 portrait; margin: 6mm; } *{box-sizing:border-box}body{margin:0;background:#FCFBF7;color:#2A2A2A;font:12px Arial,sans-serif}.sheet{border:2px solid #C5A059;padding:14px}.dev{font-family:NotoDevanagari,sans-serif}.masthead{background:#581220;color:#DFCA95;text-align:center;padding:13px;border:1px solid #DFCA95}.masthead h1{margin:4px;font-size:24px}.hero{display:flex;justify-content:space-between;gap:12px;padding:12px 2px;border-bottom:1px solid #C5A059}.photo{width:88px;height:108px;object-fit:cover;border:2px solid #C5A059}.card{break-inside: avoid;page-break-inside:avoid;border:1px solid rgba(197,160,89,.6);margin-top:10px}.card h2{margin:0;background:#6B1D2F;color:#DFCA95;padding:7px 10px;font-size:13px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0;padding:5px}.row{display:flex;gap:8px;padding:5px;border-bottom:1px solid #eee;min-width:0}.row b{color:#581220;min-width:105px}.row span{overflow-wrap:anywhere}.gotras{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;padding:8px}.gotra{background:#FDF9F0;border:1px solid #C5A059;padding:7px;text-align:center}.gotra small{display:block;color:#6B1D2F}.gotra strong{display:block;margin-top:3px}.footer{margin-top:12px;background:#581220;color:#DFCA95;padding:8px;text-align:center;font-size:10px}@media print{body{background:#fff}.sheet{border-width:1px}}
</style></head><body><main class="sheet"><header class="masthead"><div class="dev">॥ श्री गणेशाय नमः ॥</div><h1>वैवाहिक परिचय पत्र</h1><div class="dev">॥ श्री कुलदेव्यै नमः ॥</div></header><div class="hero"><div><small>Registration No. ${escapeHtml(data.id)}</small><h2>${escapeHtml(data.fullName)}</h2>${present(data.gender) ? `<span>${escapeHtml(data.gender)}</span>` : ""}</div>${photoHtml}</div>${section("Personal particulars", personal)}${section("Horoscope & astrology", astrology)}${section("Education & career", education)}${section("Family background", family)}${section("Four-gotra lineage", gotraBadges ? `<div class="gotras">${gotraBadges}</div>` : "")}${section("Partner expectations & contact", contact)}<footer class="footer">${escapeHtml(data.verificationSeal || "MAFL Verified Matrimonial Profile")} • ${escapeHtml(data.footerPortalInfo || "Maharaja Agrasen Foundation Limited Singapore")}</footer></main></body></html>`;
}

export function normalizeProfileToBiodataProps(profile: any): BiodataTemplateProps {
  const height = profile.heightDisplay || (profile.heightCm ? `${profile.heightCm} cm` : undefined);
  const preferences = profile.partnerPreferences || {};
  return {
    id: profile.id || profile.matrimonialProfileId || "MAFL/MAT/PENDING", fullName: profile.fullName || "Candidate", gender: profile.gender, dob: profile.dob, age: profile.age, height, weight: profile.weight || profile.weightBuild, complexion: profile.complexion, bloodGroup: profile.bloodGroup, diet: profile.diet, motherTongue: profile.motherTongue, languages: profile.languages || profile.languagesSpoken, aboutMe: profile.aboutMe, photoBase64: profile.photoBase64, photoUrl: profile.photoUrl || profile.photos?.[0], gotra: profile.gotra, fourGotras: profile.fourGotras || { selfGotra: profile.gotra }, manglik: profile.manglik, rashi: profile.rashi, nakshatra: profile.nakshatra, charan: profile.charan, tob: profile.tob || profile.timeOfBirth, pob: profile.pob || profile.placeOfBirth, highestEducation: profile.highestEducation, college: profile.college || profile.collegeName, schooling: profile.schooling || profile.schoolingHonors, occupation: profile.occupation || profile.occupationTitle, company: profile.company || profile.companyName, annualIncome: profile.annualIncome, workLocation: profile.workLocation || [profile.workCity, profile.workCountry].filter(Boolean).join(", "), fatherName: profile.fatherName, fatherOccupation: profile.fatherOccupation, motherName: profile.motherName, motherOccupation: profile.motherOccupation, siblings: profile.siblings || profile.linkedSiblings?.map((s: any) => [s.relationLabel || s.relation, s.name, s.occupation].filter(Boolean).join(": ")), nativePlace: profile.nativePlace, currentCity: profile.currentCity || profile.familyLocation, familyType: profile.familyType, familyValues: profile.familyValues, partnerPreferences: { ...preferences, education: Array.isArray(preferences.education) ? preferences.education.join(", ") : preferences.education, diet: Array.isArray(preferences.diet) ? preferences.diet.join(", ") : preferences.diet, location: Array.isArray(preferences.preferredLocations) ? preferences.preferredLocations.join(", ") : preferences.location }, contactPerson: profile.contactPerson, contactPhone: profile.contactPhone, secondaryPhone: profile.secondaryPhone, contactEmail: profile.contactEmail, residentialAddress: profile.residentialAddress, verificationSeal: profile.verificationSeal || (profile.isGovtIdVerified ? "MAFL Verified Profile" : undefined), footerPortalInfo: profile.footerPortalInfo,
  };
}
