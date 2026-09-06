/**
 * Base URL and Pass Formatting Utilities
 * Resolves current deployment domain and unifies pass data construction for 100% PDF parity across Email and Web.
 */

export function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "https://agrawal-web.vercel.app";
}

export function formatRoleLabel(relationToHead?: string): string {
  if (!relationToHead) return "Member";
  const r = relationToHead.toLowerCase().trim();
  if (r === "self") return "Head of Household";
  if (r === "spouse") return "Spouse";
  if (r === "son") return "Son";
  if (r === "daughter") return "Daughter";
  if (r === "parent") return "Parent";
  return r.charAt(0).toUpperCase() + r.slice(1);
}

const KNOWN_WORDS: Record<string, string> = {
  "वानरराज": "Vanarraj",
  "केसरी": "Kesari",
  "किष्किंधा": "Kishkindha",
  "किष्किन्धा": "Kishkindha",
  "का": "Ka",
  "की": "Ki",
  "के": "Ke",
  "अंजनाद्री": "Anjanadri",
  "अञ्जनाद्री": "Anjanadri",
  "अंजना": "Anjana",
  "सालासर": "Salasar",
  "बालाजी": "Balaji",
  "सूरजगढ़": "Surajgarh",
  "राजस्थान": "Rajasthan",
  "अग्रसेन": "Agrasen",
  "महाराजा": "Maharaja",
  "भगवान": "Bhagwan",
  "प्रभु": "Prabhu",
  "राम": "Ram",
  "श्री": "Shri",
  "हनुमान": "Hanuman",
  "पवनपुत्र": "Pawanputra",
  "चूरू": "Churu",
  "सुजानगढ़": "Sujangarh",
  "अग्रवाल": "Agarwal",
  "भारत": "Bharat",
  "मंदिर": "Mandir",
  "सेवा": "Sewa",
};

const VOWELS: Record<string, string> = {
  "अ": "A", "आ": "Aa", "इ": "I", "ई": "Ee", "उ": "U", "ऊ": "Oo",
  "ऋ": "Ri", "ए": "E", "ऐ": "Ai", "ओ": "O", "औ": "Au",
  "अं": "An", "अँ": "An", "अः": "Ah"
};

const MATRAS: Record<string, string> = {
  "ा": "a", "ि": "i", "ी": "i", "ु": "u", "ू": "oo",
  "ृ": "ri", "े": "e", "ै": "ai", "ो": "o", "ौ": "au",
  "ं": "n", "ँ": "n", "ः": "h"
};

const CONSONANTS: Record<string, string> = {
  "क": "k", "ख": "kh", "ग": "g", "घ": "gh", "ङ": "ng",
  "च": "ch", "छ": "chh", "ज": "j", "झ": "jh", "ञ": "ny",
  "ट": "t", "ठ": "th", "ड": "d", "ढ": "dh", "ण": "n",
  "त": "t", "थ": "th", "द": "d", "ध": "dh", "न": "n",
  "प": "p", "फ": "ph", "ब": "b", "भ": "bh", "म": "m",
  "य": "y", "र": "r", "ल": "l", "व": "v", "श": "sh",
  "ष": "sh", "स": "s", "ह": "h", "क़": "q", "ख़": "kh",
  "ग़": "gh", "ज़": "z", "फ़": "f", "ड़": "r", "ढ़": "rh"
};

export function hasDevanagari(text: string): boolean {
  return /[\u0900-\u097F]/.test(text);
}

export function transliterateDevanagariWord(word: string): string {
  if (!word) return "";
  if (KNOWN_WORDS[word]) return KNOWN_WORDS[word];

  const cleanWord = word.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "");
  if (KNOWN_WORDS[cleanWord]) return KNOWN_WORDS[cleanWord];

  let result = "";
  const chars = Array.from(word);

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const next = chars[i + 1];

    if (VOWELS[ch]) {
      result += VOWELS[ch];
    } else if (CONSONANTS[ch]) {
      const base = CONSONANTS[ch];
      if (next === "्") {
        result += base;
        i++;
      } else if (next && MATRAS[next]) {
        result += base + MATRAS[next];
        i++;
      } else {
        const isEnd = i === chars.length - 1 || !/[\u0900-\u097F]/.test(next);
        result += isEnd ? base : base + "a";
      }
    } else if (MATRAS[ch]) {
      result += MATRAS[ch];
    } else {
      result += ch;
    }
  }

  if (result.length > 0) {
    result = result.charAt(0).toUpperCase() + result.slice(1);
  }
  return result;
}

export function toSafeLatinText(input?: string | null): string {
  if (!input) return "";

  // 1. Normalize smart quotes and typographic characters for Helvetica ASCII compatibility
  const sanitized = input
    .replace(/[\u201C\u201D\u201E\u201F\u00AB\u00BB]/g, '"')
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u2013\u2014\u2015]/g, "-");

  if (!hasDevanagari(sanitized)) return sanitized;

  return sanitized
    .split(/\s+/)
    .map((w) => transliterateDevanagariWord(w))
    .join(" ");
}


export interface PassDataInput {
  member: any;
  household?: any;
}

export function createUnifiedPassData({ member, household }: PassDataInput) {
  const serialNo =
    member.serialNo ||
    household?.serialNo ||
    member.householdCode ||
    household?.householdCode ||
    "MAFL-2026-IND-00001";

  const rawGotra = member.gotra || household?.gotra || "Garg";
  const gotra = toSafeLatinText(rawGotra);
  const householdCode = member.householdCode || household?.householdCode || serialNo;
  const rawCity =
    member.currentCity || household?.city || household?.nativePlace || member.nativePlace || "Delhi";
  const currentCity = toSafeLatinText(rawCity);
  const rawNativePlace = member.nativePlace || household?.nativePlace || currentCity;
  const nativePlace = toSafeLatinText(rawNativePlace);
  const rawFatherName = member.fatherName || household?.headName || undefined;
  const fatherName = rawFatherName ? toSafeLatinText(rawFatherName) : undefined;
  const fullName = toSafeLatinText(member.fullName);

  const isSpouseOrMarriedFemale =
    member.maritalStatus === "Married" &&
    (member.gender === "Female" || member.relationToHead === "spouse");
  const fatherOrHusbandLabel = isSpouseOrMarriedFemale ? "HUSBAND / FATHER" : "FATHER";

  return {
    fullName,
    gotra,
    householdCode,
    serialNo,
    currentCity,
    roleLabel: formatRoleLabel(member.relationToHead),
    photoUrl: member.photoUrl,
    nativePlace,
    fatherName,
    fatherOrHusbandLabel,
    companyName: member.companyName ? toSafeLatinText(member.companyName) : undefined,
    profession: member.professionTitle || member.profession ? toSafeLatinText(member.professionTitle || member.profession) : undefined,
  };
}
