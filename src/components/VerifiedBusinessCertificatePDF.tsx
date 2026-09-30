import React from "react";
import fs from "fs";
import path from "path";
import { Document, Font, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { BusinessProfile } from "@/types/business";

const MAROON = "#701B2C";
const GOLD = "#C69B43";
const CREAM = "#FFFDF8";
const CHARCOAL = "#45413C";

function loadAsset(paths: string[]): string | undefined {
  for (const assetPath of paths) {
    try {
      return `data:image/png;base64,${fs.readFileSync(assetPath).toString("base64")}`;
    } catch {
      // Try the next tracked asset location.
    }
  }
  return undefined;
}

const crest = loadAsset([path.join(process.cwd(), "public", "images", "logo-transparent.png")]);
// The approved metallic mark is a project asset, not a hand-drawn substitute.
const verifiedBadge = loadAsset([
  path.join(process.cwd(), "public", "images", "verified-business-badge.png"),
  path.join(process.cwd(), "..", "opendesign", "assets", "images", "verified-business-badge.png"),
]);
// Official MAFL Singapore red ink seal with UEN 202551557G.
const officialSeal = loadAsset([
  path.join(process.cwd(), "public", "images", "mafl-official-seal.png"),
  path.join(process.cwd(), "..", "opendesign", "assets", "images", "mafl-official-seal.png"),
]);
const devanagari = path.join(process.cwd(), "public", "fonts", "NotoSansDevanagari-Regular.ttf");
try { if (fs.existsSync(devanagari)) Font.register({ family: "MAFLDevanagari", src: devanagari }); } catch { /* optional decorative font */ }

const s = StyleSheet.create({
  page: { backgroundColor: CREAM, padding: 10, color: CHARCOAL, fontFamily: "Helvetica" },
  outer: { flex: 1, backgroundColor: MAROON, padding: 8 }, cream: { flex: 1, backgroundColor: CREAM, padding: 7 },
  gold: { flex: 1, border: `1.5 solid ${GOLD}`, padding: 5 }, inner: { flex: 1, border: `0.7 solid ${GOLD}`, paddingHorizontal: 26, paddingTop: 16, paddingBottom: 12 },
  header: { height: 98, flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  crest: { width: 78, height: 78, objectFit: "contain" }, spacer: { width: 78, height: 78 },
  identity: { alignItems: "center", paddingTop: 4, flexGrow: 1 }, foundation: { color: MAROON, fontFamily: "Times-Bold", fontSize: 25 },
  foundationSub: { color: MAROON, fontFamily: "Helvetica-Bold", fontSize: 11, letterSpacing: 1.1, marginTop: 2 },
  rule: { width: 287, height: 1, backgroundColor: GOLD, marginTop: 10, position: "relative" }, diamond: { position: "absolute", width: 7, height: 7, backgroundColor: GOLD, top: -3, left: 140, transform: "rotate(45deg)" },
  badge: { width: 82, height: 82, objectFit: "contain" },
  badgeInner: { width: 68, height: 68, border: "1 solid #C6C6C1", borderRadius: 34, alignItems: "center", justifyContent: "center" },
  tick: { color: MAROON, fontFamily: "Helvetica-Bold", fontSize: 23, lineHeight: 22 }, badgeText: { color: "#6D6D68", fontFamily: "Helvetica-Bold", fontSize: 5.7, letterSpacing: .45, marginTop: 1 }, badgeSub: { color: "#77736E", fontSize: 4.5, letterSpacing: .45, marginTop: 2 },
  body: { alignItems: "center", flexGrow: 1, paddingTop: 1 }, title: { color: MAROON, fontFamily: "Times-Bold", fontSize: 31 },
  subtitle: { color: "#B17618", fontFamily: "Helvetica-Bold", fontSize: 12, letterSpacing: 1.1, marginTop: 1 }, certify: { color: CHARCOAL, fontFamily: "Times-Italic", fontSize: 15, marginTop: 16 },
  name: { color: MAROON, fontFamily: "Times-Bold", fontSize: 21, textAlign: "center", marginTop: 14 }, nameRule: { backgroundColor: GOLD, height: .7, width: 450, marginTop: 5 },
  location: { color: CHARCOAL, fontFamily: "Helvetica-Bold", fontSize: 12, letterSpacing: 1.2, marginTop: 11 }, statement: { color: CHARCOAL, fontSize: 11, marginTop: 14 },
  directory: { color: MAROON, fontFamily: "Times-Bold", fontSize: 16, marginTop: 3 }, motto: { color: CHARCOAL, fontFamily: "Helvetica-Oblique", fontSize: 10, marginTop: 3 },
  lower: { height: 110, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }, number: { width: 222, height: 57, border: `1 solid ${GOLD}`, borderRadius: 3, backgroundColor: "#FFF9EC", paddingHorizontal: 14, paddingTop: 8 },
  numberLabel: { color: "#8D6A2B", fontFamily: "Helvetica-Bold", fontSize: 8, letterSpacing: .8 }, numberValue: { color: MAROON, fontFamily: "Helvetica-Bold", fontSize: 13, marginTop: 5 }, verifiedOn: { color: CHARCOAL, fontSize: 8, marginTop: 3 },
  signature: { width: 250, alignItems: "center", position: "relative", paddingTop: 72 }, seal: { position: "absolute", top: 0, left: 95, width: 60, height: 60, border: `1.3 solid ${MAROON}`, borderRadius: 30, alignItems: "center", justifyContent: "center" },
  sealImage: { position: "absolute", top: 0, left: 95, width: 60, height: 60, objectFit: "contain" },
  sealInner: { width: 50, height: 50, border: `0.7 solid ${MAROON}`, borderRadius: 25, alignItems: "center", justifyContent: "center" }, sealText: { color: MAROON, fontFamily: "Times-Bold", fontSize: 7, textAlign: "center" }, sealSub: { color: MAROON, fontFamily: "Helvetica-Bold", fontSize: 5, textAlign: "center", marginTop: 2 },
  signatureLine: { width: 193, height: .8, backgroundColor: MAROON }, signatory: { color: MAROON, fontFamily: "Times-Bold", fontSize: 11, marginTop: 8 }, signatoryMeta: { color: CHARCOAL, fontSize: 8.5, marginTop: 3 },
  footer: { marginTop: 6, height: 35, backgroundColor: MAROON, alignItems: "center", justifyContent: "center" }, footerText: { color: "#FFFFFF", fontFamily: "Helvetica-Bold", fontSize: 9.5, letterSpacing: .5 }, footerUrl: { color: "#F6E8C9", fontSize: 7.2, marginTop: 2 },
});

function text(value: string | undefined, fallback: string) { return (value || fallback).replace(/[\r\n]+/g, " ").trim().slice(0, 160); }
function formatDate(value?: string) { const date = value ? new Date(value) : new Date(); return Number.isNaN(date.valueOf()) ? "" : new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" }).format(date); }

/** The approved DSK Electricals layout, with the permanent MAFLBUS number and website footer. */
export function VerifiedBusinessCertificatePDF({ business, issuedAt }: { business: BusinessProfile; issuedAt?: string }) {
  const location = [business.city, business.state, business.country].filter(Boolean).map((value) => text(value, "").toUpperCase()).join(" · ");
  const issued = formatDate(issuedAt);
  return <Document title={`${text(business.businessName, "Business")} - Verified Business Certificate`} author="Maharaja Agrasen Foundation Limited Singapore">
    <Page size="A4" orientation="landscape" style={s.page}><View style={s.outer}><View style={s.cream}><View style={s.gold}><View style={s.inner}>
      <View style={s.header}>
        {crest ? <Image src={crest} style={s.crest} /> : <View style={s.spacer} />}
        <View style={s.identity}><Text style={s.foundation}>MAHARAJA AGRASEN</Text><Text style={s.foundationSub}>FOUNDATION LIMITED · SINGAPORE</Text><View style={s.rule}><View style={s.diamond} /></View></View>
        {verifiedBadge ? <Image src={verifiedBadge} style={s.badge} /> : <View style={s.badgeInner}><Text style={s.tick}>✓</Text><Text style={s.badgeText}>VERIFIED BUSINESS</Text><Text style={s.badgeSub}>MAFL SINGAPORE</Text></View>}
      </View>
      <View style={s.body}><Text style={s.title}>CERTIFICATE</Text><Text style={s.subtitle}>OF VERIFIED BUSINESS REGISTRATION</Text><Text style={s.certify}>This is to certify that</Text><Text style={s.name}>{text(business.businessName, "BUSINESS ENTERPRISE").toUpperCase()}</Text><View style={s.nameRule} /><Text style={s.location}>{location || "GLOBAL AGRAWAL COMMUNITY"}</Text><Text style={s.statement}>has completed MAFL&apos;s business verification process and is listed in the</Text><Text style={s.directory}>MAFL Global Agrawal Business Directory</Text><Text style={s.motto}>Connecting Agrawal businesses and families worldwide</Text></View>
      <View style={s.lower}><View style={s.number}><Text style={s.numberLabel}>BUSINESS NUMBER</Text><Text style={s.numberValue}>{text(business.businessSerialNo, "MAFLBUS")}</Text><Text style={s.verifiedOn}>{issued ? `Verified on ${issued}` : "Verified business"}</Text></View><View style={s.signature}>{officialSeal ? <Image src={officialSeal} style={s.sealImage} /> : <View style={s.seal}><View style={s.sealInner}><Text style={s.sealText}>MAFL{`\n`}SINGAPORE</Text><Text style={s.sealSub}>OFFICIAL SEAL</Text></View></View>}<View style={s.signatureLine} /><Text style={s.signatory}>SOHAN LAL JINDAL</Text><Text style={s.signatoryMeta}>Founder &amp; Chairman · Certified by MAFL</Text></View></View>
      <View style={s.footer}><Text style={s.footerText}>VERIFIED BUSINESS · MAFL GLOBAL AGRAWAL BUSINESS DIRECTORY</Text><Text style={s.footerUrl}>www.maharajaagrasenfoundation.com</Text></View>
    </View></View></View></View></Page>
  </Document>;
}

