
import fs from "fs";

function fixFile(path) {
  let code = fs.readFileSync(path, "utf8");
  code = code.replace(/return process\.env\.AUTH_SECRET \|\| "agarwal_dir_secure_[^"]+";/, "if (!process.env.AUTH_SECRET) throw new Error(\"Missing AUTH_SECRET environment variable\");\n  return process.env.AUTH_SECRET;");
  fs.writeFileSync(path, code);
}

fixFile("src/actions/otp.ts");
fixFile("src/lib/auth-tokens.ts");

