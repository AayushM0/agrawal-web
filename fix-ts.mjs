
import fs from "fs";
let code = fs.readFileSync("src/actions/otp.ts", "utf8");
code = code.replace(
  "export interface SendOtpInput {\n  recipient: string;\n  type?: \"sms\" | \"email\";\n}",
  "export interface SendOtpInput {\n  recipient: string;\n  type?: string;\n}"
);
fs.writeFileSync("src/actions/otp.ts", code);

