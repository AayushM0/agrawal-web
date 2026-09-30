import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.join(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("business certificate lifecycle is additive, private, and approval-bound", () => {
  const schema = read("src/db/schema.sql");
  const db = read("src/lib/db.ts");
  const moderation = read("src/actions/moderate.ts");
  const route = read("src/app/api/businesses/[id]/certificate/route.ts");

  assert.ok(schema.includes("CREATE TABLE IF NOT EXISTS business_certificate_issuances"));
  assert.ok(schema.includes("CREATE TABLE IF NOT EXISTS business_certificate_deliveries"));
  assert.ok(schema.includes("ON CONFLICT (business_id, generation) DO NOTHING"));
  assert.ok(db.includes("approveAndVerifyBusinessProfile(id: string, issuedByAdminId?: string)"));
  assert.ok(db.includes("certificateNewlyIssued"));
  assert.ok(db.includes("WHERE business_id = $1"), "issuance generation must bind the business UUID consistently");
  assert.ok(!db.includes("WHERE business_id::text = $1), 1), 'active', $2"), "one PostgreSQL parameter cannot be inferred as both UUID and text");
  assert.ok(moderation.includes("queueBusinessCertificateDelivery"));
  assert.ok(moderation.includes("resendBusinessCertificateAction"));
  assert.ok(route.includes("session.role === \"admin\" || await db.isProfileManager"));
  assert.ok(route.includes("business.status !== \"live\" || !business.isVerifiedBadge"));
});

test("rejection disables a certificate without recycling its permanent MAFLBUS number", () => {
  const db = read("src/lib/db.ts");
  const moderationPage = read("src/app/admin/moderation/page.tsx");

  assert.ok(!db.includes("if (status === \"rejected\") list[idx].businessSerialNo = undefined"));
  assert.ok(!db.includes('if (status === "rejected") sets.push("business_serial_no = NULL")'));
  assert.ok(db.includes("UPDATE business_certificate_issuances SET status = 'inactive'"));
  assert.ok(db.includes("COALESCE((SELECT MAX(generation) + 1"), "reapproval must create a new internal issuance generation");
  assert.ok(moderationPage.includes("Reject &amp; Disable Certificate"), "admins need a deliberate live-business rejection control for reapproval QA");
  assert.ok(moderationPage.includes("Rejected businesses"), "rejected businesses must remain visible to admins for direct reapproval");
  assert.ok(moderationPage.includes("Reapprove &amp; Restore Certificate"), "admin reapproval must not require owner resubmission");
});

test("certificate rendering uses current details without moderation side effects", () => {
  const pdf = read("src/components/VerifiedBusinessCertificatePDF.tsx");
  const businessActions = read("src/actions/business.ts");
  const dispatch = read("src/lib/business-certificate.ts");

  assert.ok(pdf.includes("business.businessName"));
  assert.ok(pdf.includes("business.businessSerialNo"));
  assert.ok(pdf.includes("OF VERIFIED BUSINESS REGISTRATION"), "certificate must retain the approved verified-business heading");
  assert.ok(pdf.includes("BUSINESS NUMBER"), "MAFLBUS must replace the old GST number panel");
  assert.ok(pdf.includes("www.maharajaagrasenfoundation.com"), "certificate footer must contain the official website");
  assert.ok(pdf.includes("verified-business-badge.png"), "certificate must use the approved metallic verified-business asset");
  assert.ok(pdf.includes("mafl-official-seal.png"), "certificate must use the official MAFL Singapore seal asset");
  assert.ok(pdf.includes("paddingTop: 72"), "official seal must sit above, not across, the signature line");
  assert.ok(pdf.includes("left: 95"), "official seal must be centered over the 250-point signature block");
  assert.ok(pdf.includes("has completed MAFL"), "certificate must retain the approved verification wording");
  assert.ok(dispatch.includes("VerifiedBusinessCertificatePDF"), "only the approved certificate renderer may be dispatched");
  assert.ok(dispatch.includes("params.issuance.issuedAt"), "emailed certificates must use their approval date");
  assert.ok(dispatch.includes("getBusinessCertificateRecipients"));
  assert.ok(dispatch.includes("byEmail.set"));
  assert.ok(!businessActions.includes("certificateNewlyIssued"), "ordinary business edits must not issue certificates");
});
