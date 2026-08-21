
import fs from "fs";

let code = fs.readFileSync("src/lib/db.ts", "utf8");

// We will just do line-by-line filtering or simple string replace for known blocks
code = code.replace(/import \{ initialMockHouseholds \} from "\.\.\/data\/mockMembers";\n/g, "");

// Remove class FallbackStore { ... } const fallbackStore = new FallbackStore();
const startIdx = code.indexOf("// In-memory fallback if DATABASE_URL");
const endIdx = code.indexOf("const fallbackStore = new FallbackStore();");
if (startIdx !== -1 && endIdx !== -1) {
  code = code.substring(0, startIdx) + code.substring(endIdx + "const fallbackStore = new FallbackStore();\n".length);
}

// Remove all fallbackStore usage
code = code.replace(/if \(!pool\) return fallbackStore\.[^\n]+\n/g, "if (!pool) throw new Error(\"Database not connected\");\n");
code = code.replace(/if \(res\.rows\.length === 0\) return fallbackStore\.[^\n]+\n/g, "if (res.rows.length === 0) return null;\n");
code = code.replace(/await fallbackStore\.[^\n]+\n/g, "");
code = code.replace(/fallbackStore\.[^\n]+\n/g, "");
code = code.replace(/if \(!h\) return fallbackStore\.[^\n]+\n/g, "if (!h) return null;\n");

// Write back
fs.writeFileSync("src/lib/db.ts", code);

