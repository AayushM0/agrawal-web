import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(__dirname, "..");

test("Claim verification is strictly email-based and blocks sending OTP to duplicate emails", () => {
  const claimPageCode = fs.readFileSync(path.join(webRoot, "src/app/claim/page.tsx"), "utf8");
  const claimActionCode = fs.readFileSync(path.join(webRoot, "src/actions/claim.ts"), "utf8");

  // Must remove Mobile (WhatsApp) channel option from claim UI
  assert.ok(
    !claimPageCode.includes("Mobile (WhatsApp)"),
    "claim/page.tsx must remove the Mobile (WhatsApp) verification option"
  );

  // Must check contact availability before dispatching OTP in handleSendOtp
  assert.ok(
    claimPageCode.includes("checkContactAvailability(cleanEmail") || claimPageCode.includes("checkContactAvailability("),
    "claim/page.tsx handleSendOtp must verify email availability before calling sendOtp"
  );

  // verifyMemberClaim must not reject email claiming just because member has a phone number
  assert.ok(
    !claimActionCode.includes("This profile can only be claimed using the registered phone number ending in"),
    "claim.ts must allow claiming via verified email even if member has a phone number"
  );
});
