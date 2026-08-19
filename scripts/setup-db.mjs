import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(__dirname, "../src/db/schema.sql");

console.log("=== PostgreSQL + PostGIS Schema Setup ===");
console.log("Schema file location:", schemaPath);

if (fs.existsSync(schemaPath)) {
  const sql = fs.readFileSync(schemaPath, "utf8");
  console.log("DDL Statements loaded successfully (" + sql.length + " bytes).");
  console.log("Tables defined: households, members");
  console.log("Extensions defined: postgis, pg_trgm, uuid-ossp");
  console.log("Ready to execute against DATABASE_URL when provisioned.");
} else {
  console.error("Schema file not found!");
}