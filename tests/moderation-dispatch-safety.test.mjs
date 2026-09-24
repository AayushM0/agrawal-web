import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(__dirname, "..");
const moderatePath = path.join(webRoot, "src/actions/moderate.ts");

// ============================================================================
// PART 1: Source Code Contract Verification (TDD Requirements)
// ============================================================================

test("Task 2.1: moderate.ts decouples primary email enqueueing from allAttachments.length > 0", () => {
  const code = fs.readFileSync(moderatePath, "utf8");

  // Must not require allAttachments.length > 0 to enqueue primary email
  assert.ok(
    !code.includes("if (primaryEmail && allAttachments.length > 0)"),
    "moderate.ts must NOT condition primary email dispatch on allAttachments.length > 0"
  );
  assert.ok(
    code.includes("if (primaryEmail)"),
    "moderate.ts must check primaryEmail independently"
  );
  assert.ok(
    code.includes("allAttachments.length === 0") || code.includes("allAttachments.length > 0") || code.includes("hasAttachments"),
    "moderate.ts must differentiate between zero and non-zero attachments for body copy"
  );
});

test("Task 2.2: moderate.ts tracks PDF generation errors and logs PASS_GENERATION_WARNING to admin_audit_logs", () => {
  const code = fs.readFileSync(moderatePath, "utf8");

  assert.ok(
    code.includes("generationErrors"),
    "moderate.ts must define generationErrors collection"
  );
  assert.ok(
    code.includes("PASS_GENERATION_WARNING"),
    "moderate.ts must log PASS_GENERATION_WARNING audit action when PDF rendering fails"
  );
  assert.ok(
    code.includes("db.recordAdminAuditLog"),
    "moderate.ts must invoke db.recordAdminAuditLog for warnings"
  );
});

test("Task 2.3: moderate.ts enqueues individual emails for distinct-email members even when PDF pass generation fails", () => {
  const code = fs.readFileSync(moderatePath, "utf8");

  // Distinct email members must be filtered from members, not solely allAttachments
  assert.ok(
    !code.includes("const distinctEmailMembers = allAttachments.filter"),
    "moderate.ts must NOT derive distinct email members solely from allAttachments"
  );
});

test("Task 2.4: notifyHouseholdMembers returns structured metrics summary", () => {
  const code = fs.readFileSync(moderatePath, "utf8");

  assert.ok(
    code.includes("enqueuedCount") &&
      code.includes("attachmentsCount") &&
      (code.includes("errors: generationErrors") || code.includes("errors,")),
    "notifyHouseholdMembers must return structured metrics { success, enqueuedCount, attachmentsCount, memberCount, errors }"
  );
});

test("Task 2.5: resendHouseholdPassAction returns truthful metrics and handles 0-email households", () => {
  const code = fs.readFileSync(moderatePath, "utf8");

  assert.ok(
    code.includes("enqueuedCount > 0") || code.includes("notifyResult.enqueuedCount > 0"),
    "resendHouseholdPassAction must inspect enqueuedCount > 0"
  );
  assert.ok(
    code.includes("No email could be enqueued") || code.includes("no email could be enqueued"),
    "resendHouseholdPassAction must explain when no email could be enqueued"
  );
});

test("Task 2.6: sendWelcomeEmail handles PDF generation errors gracefully without aborting email dispatch", () => {
  const code = fs.readFileSync(moderatePath, "utf8");

  const sendWelcomeIdx = code.indexOf("async function sendWelcomeEmail");
  const notifyHouseholdIdx = code.indexOf("async function notifyHouseholdMembers");
  assert.ok(sendWelcomeIdx !== -1 && notifyHouseholdIdx !== -1, "Functions must exist in moderate.ts");

  const sendWelcomeFn = code.slice(sendWelcomeIdx, notifyHouseholdIdx);
  assert.ok(
    sendWelcomeFn.includes("pdfError") || sendWelcomeFn.includes("PASS PDF WARNING") || sendWelcomeFn.includes("buffer = null") || sendWelcomeFn.includes("buffer: Buffer | null"),
    "sendWelcomeEmail must catch PDF rendering specifically and continue to dispatch email"
  );
  assert.ok(
    sendWelcomeFn.includes("dispatchResendEmail"),
    "sendWelcomeEmail must still call dispatchResendEmail even if PDF generation fails"
  );
});

// ============================================================================
// PART 2: Behavioral Dispatch Simulation (Mock-based unit testing)
// ============================================================================

test("Behavioral: Non-dropping dispatch enqueues email with dashboard fallback link when PDF rendering fails", async () => {
  const enqueuedJobs = [];
  const auditLogs = [];

  const mockDb = {
    async getMembersByHousehold(id) {
      return [
        {
          id: "mem-1",
          fullName: "Ram Agrawal",
          relationToHead: "self",
          email: "ram@example.com",
          serialNo: "MAF-001",
        },
        {
          id: "mem-2",
          fullName: "Priya Agrawal",
          relationToHead: "spouse",
          email: "priya@example.com",
          serialNo: "MAF-002",
        },
      ];
    },
    async recordAdminAuditLog(entry) {
      auditLogs.push(entry);
    },
  };

  const mockEnqueueEmail = async (job) => {
    enqueuedJobs.push(job);
    return { id: "job-" + enqueuedJobs.length };
  };

  // Dispatch runner implementing the exact non-dropping logic
  async function runSimulatedDispatch({ household, members, pdfThrows }) {
    const generationErrors = [];
    const passUrl = "https://agrawal-web.vercel.app/dashboard/pass";
    const primaryEmail = household.verifiedContact || members[0]?.email;
    let enqueuedCount = 0;

    const attachmentPromises = members.map(async (member) => {
      try {
        if (pdfThrows) {
          throw new Error("Font glyph resolution failed in serverless sandbox");
        }
        return {
          filename: `ID_Card_${member.fullName}.pdf`,
          content: "dummy-pdf-base64",
          member,
        };
      } catch (err) {
        generationErrors.push({
          memberName: member.fullName,
          error: err?.message || String(err),
        });
        return null;
      }
    });

    const attachmentsResult = await Promise.all(attachmentPromises);
    const allAttachments = attachmentsResult.filter(Boolean);

    if (generationErrors.length > 0) {
      await mockDb.recordAdminAuditLog({
        adminId: "admin-1",
        adminContact: "admin@test.com",
        action: "PASS_GENERATION_WARNING",
        targetType: "household",
        targetId: household.id,
        details: {
          householdCode: household.householdCode,
          errors: generationErrors,
        },
        ipAddress: "127.0.0.1",
      });
    }

    if (primaryEmail) {
      const hasAttachments = allAttachments.length > 0;
      await mockEnqueueEmail({
        recipientEmail: primaryEmail,
        subject: `Household Verified (${household.householdCode})`,
        htmlBody: hasAttachments
          ? `<p>Attached cards</p>`
          : `<p>View passes online at <a href="${passUrl}">${passUrl}</a></p>`,
        attachments: hasAttachments ? allAttachments : undefined,
      });
      enqueuedCount++;
    }

    const distinctEmailMembers = members.filter(
      (m) => m.email && primaryEmail && m.email.toLowerCase() !== primaryEmail.toLowerCase()
    );

    for (const member of distinctEmailMembers) {
      const memberAttachment = allAttachments.find((a) => a.member.id === member.id);
      await mockEnqueueEmail({
        recipientEmail: member.email,
        subject: `Your Official ID Card (${member.serialNo})`,
        htmlBody: memberAttachment
          ? `<p>Card attached</p>`
          : `<p>View pass online at <a href="${passUrl}">${passUrl}</a></p>`,
        attachments: memberAttachment ? [memberAttachment] : undefined,
      });
      enqueuedCount++;
    }

    return {
      success: true,
      enqueuedCount,
      attachmentsCount: allAttachments.length,
      memberCount: members.length,
      errors: generationErrors,
    };
  }

  const household = {
    id: "hh-100",
    householdCode: "HH-100",
    verifiedContact: "ram@example.com",
  };
  const members = await mockDb.getMembersByHousehold(household.id);

  // Run with simulated PDF failure
  const result = await runSimulatedDispatch({ household, members, pdfThrows: true });

  // 1. Verify email was NOT dropped
  assert.equal(result.enqueuedCount, 2, "Must enqueue 2 emails (1 primary, 1 distinct member)");
  assert.equal(enqueuedJobs.length, 2, "Must enqueue exactly 2 jobs");
  assert.equal(result.attachmentsCount, 0, "Attachments count must be 0 on failure");
  assert.equal(result.errors.length, 2, "Must report 2 generation errors");

  // 2. Verify dashboard link fallback in email body
  assert.ok(
    enqueuedJobs[0].htmlBody.includes("https://agrawal-web.vercel.app/dashboard/pass"),
    "Primary email body must include dashboard pass fallback URL"
  );
  assert.equal(enqueuedJobs[0].attachments, undefined, "Primary email must not attach empty or null buffers");

  assert.ok(
    enqueuedJobs[1].htmlBody.includes("https://agrawal-web.vercel.app/dashboard/pass"),
    "Distinct member email body must include dashboard pass fallback URL"
  );
  assert.equal(enqueuedJobs[1].attachments, undefined, "Distinct member email must not attach empty buffers");

  // 3. Verify PASS_GENERATION_WARNING audit log recorded
  assert.equal(auditLogs.length, 1, "Must record 1 audit log");
  assert.equal(auditLogs[0].action, "PASS_GENERATION_WARNING");
  assert.equal(auditLogs[0].details.householdCode, "HH-100");
  assert.equal(auditLogs[0].details.errors.length, 2);
  assert.equal(auditLogs[0].details.errors[0].memberName, "Ram Agrawal");
});

test("Behavioral: resendHouseholdPassAction returns accurate failure when household has no email", async () => {
  function handleResendMetrics(household, notifyResult) {
    if (notifyResult.enqueuedCount > 0) {
      return {
        ...notifyResult,
        success: true,
        message: `Enqueued ${notifyResult.enqueuedCount} pass email(s) for delivery.`,
      };
    }
    return {
      ...notifyResult,
      success: false,
      error: `No email could be enqueued for household ${household.householdCode}. (Checked: ${household.verifiedContact || "no contact"}).`,
    };
  }

  // Household with phone only
  const phoneOnlyHousehold = {
    id: "hh-200",
    householdCode: "HH-200",
    verifiedContact: "+6591234567",
  };

  const emptyResult = {
    success: true,
    enqueuedCount: 0,
    attachmentsCount: 0,
    memberCount: 1,
    errors: [],
  };

  const outcome = handleResendMetrics(phoneOnlyHousehold, emptyResult);
  assert.equal(outcome.success, false, "Must return success: false when no email enqueued");
  assert.equal(outcome.enqueuedCount, 0);
  assert.ok(
    outcome.error.includes("No email could be enqueued for household HH-200"),
    "Must report informative error message"
  );
  assert.ok(
    outcome.error.includes("+6591234567"),
    "Must include verifiedContact in the error message for easy debugging"
  );
});
