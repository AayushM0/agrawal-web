import fs from "node:fs";
import path from "node:path";
import { chromium, type Browser } from "@playwright/test";
import type { MatrimonialProfile } from "@/types/matrimony";
import { compileBiodataHtml, normalizeProfileToBiodataProps } from "./matrimony-biodata-template.ts";

let browserPromise: Promise<Browser> | undefined;

function browser(): Promise<Browser> {
  const localChromium = [
    "C:\\Users\\aayus\\AppData\\Local\\ms-playwright\\chromium-1243\\chrome-win64\\chrome.exe",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  ].find(fs.existsSync);
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || localChromium;
  browserPromise ??= chromium.launch({ headless: true, executablePath }).catch((error) => {
    browserPromise = undefined;
    throw error;
  });
  return browserPromise;
}

function dataUri(file: string, mime: string): string {
  const asset = path.join(process.cwd(), "public", "images", file);
  return `data:${mime};base64,${fs.readFileSync(asset).toString("base64")}`;
}

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>\"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;",
  })[character] ?? character);
}

function field(label: string, value?: string | number): string {
  return value ? `<div class="field"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>` : "";
}

function biodataHtml(profile: MatrimonialProfile): string {
  const crest = dataUri("logo-transparent.png", "image/png");
  const seal = dataUri("mafl-official-seal-original.jpg", "image/jpeg");
  const photo = profile.photos.find((item) => item.startsWith("data:image/"));
  const age = profile.age ? `${profile.age} years` : "";
  const photoMarkup = photo ? `<img class="photo" src="${photo}" alt="${escapeHtml(profile.fullName)}" />` : "<div class=\"photo placeholder\">MAFL</div>";

  return `<!doctype html><html><head><meta charset="utf-8"><style>
    @page { size: A4 portrait; margin: 6mm; }
    * { box-sizing: border-box; } body { color:#351019; font-family: Georgia, serif; margin:0; }
    .sheet { border:3px solid #8a651c; min-height:277mm; padding:11mm; position:relative; }
    header { align-items:center; border-bottom:2px solid #8a651c; display:flex; gap:12px; padding-bottom:8px; }
    .crest { height:58px; width:58px; object-fit:contain; } .seal { height:58px; margin-left:auto; width:58px; object-fit:contain; }
    h1 { color:#761d2c; font-size:21px; letter-spacing:.5px; margin:0; text-align:center; } .subtitle { color:#8a651c; font-size:11px; margin:4px 0 0; text-align:center; }
    .identity { align-items:center; display:flex; gap:18px; margin:14px 0; } .photo { border:3px solid #b28a2e; height:124px; object-fit:cover; width:98px; }
    .placeholder { align-items:center; background:#f3ead7; display:flex; font-weight:bold; justify-content:center; } h2 { color:#761d2c; font-size:15px; margin:0 0 5px; }
    .details { flex:1; } .grid { display:grid; gap:7px 14px; grid-template-columns:1fr 1fr; } .field { border-bottom:1px solid #ddcfad; font-size:11px; padding-bottom:3px; }
    .field span { color:#795b26; display:block; font-size:9px; text-transform:uppercase; } .field strong { font-weight:normal; } section { margin-top:12px; }
    footer { bottom:8mm; color:#795b26; font-size:9px; left:11mm; position:absolute; right:11mm; text-align:center; }
  </style></head><body><main class="sheet"><header><img class="crest" src="${crest}" alt="MAFL crest"><div><h1>Maharaja Agrasen Foundation Limited Singapore</h1><p class="subtitle">Official Matrimonial Biodata</p></div><img class="seal" src="${seal}" alt="MAFL official seal"></header>
    <div class="identity">${photoMarkup}<div class="details"><h2>${escapeHtml(profile.fullName)}</h2><div class="grid">${field("Profile ID", profile.id)}${field("Created for", profile.createdFor)}${field("Gender", profile.gender)}${field("Age", age)}${field("Marital status", profile.maritalStatus)}${field("Gotra", profile.gotra)}</div></div></div>
    <section><h2>Personal Details</h2><div class="grid">${field("Date of birth", profile.dob)}${field("Place of birth", profile.placeOfBirth)}${field("Height", profile.heightDisplay)}${field("Mother tongue", profile.motherTongue)}${field("Diet", profile.diet)}${field("Languages", profile.languagesSpoken.join(", "))}</div></section>
    <section><h2>Education & Career</h2><div class="grid">${field("Education", profile.highestEducation)}${field("Occupation", profile.occupationTitle)}${field("Company", profile.companyName)}${field("Work location", [profile.workCity, profile.workCountry].filter(Boolean).join(", "))}</div></section>
    <section><h2>Family Details</h2><div class="grid">${field("Father", [profile.fatherName, profile.fatherOccupation].filter(Boolean).join(" — "))}${field("Mother", [profile.motherName, profile.motherOccupation].filter(Boolean).join(" — "))}${field("Native place", profile.nativePlace)}${field("Family location", profile.familyLocation)}</div></section>
    <section><h2>Contact</h2><div class="grid">${field("Contact person", profile.contactPerson)}${field("Phone", profile.contactPhone)}${field("Email", profile.contactEmail)}${field("Address", profile.residentialAddress)}</div></section>
    <footer>www.maharajaagrasenfoundation.com · Official MAFL biodata</footer></main></body></html>`;
}

export async function renderBiodataPdf(profileData: MatrimonialProfile): Promise<Buffer> {
  const page = await (await browser()).newPage();
  try {
    const html = compileBiodataHtml(normalizeProfileToBiodataProps(profileData));
    await page.setContent(html, { waitUntil: "load" });
    return Buffer.from(await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true }));
  } finally {
    await page.close();
  }
}
