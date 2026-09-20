import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import bcrypt from "bcryptjs";

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "../.env.local");

let dbUrl = process.env.DATABASE_URL;
if (!dbUrl && fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  for (const line of envContent.split("\n")) {
    if (line.trim().startsWith("DATABASE_URL=")) {
      dbUrl = line.trim().replace(/^DATABASE_URL=/, "").replace(/["']/g, "");
      break;
    }
  }
}

if (!dbUrl) {
  console.error("❌ No DATABASE_URL found in environment or .env.local");
  process.exit(1);
}

// 🛡️ SAFETY HOST-GUARD: Strictly block any remote host!
let parsedUrl;
try {
  parsedUrl = new URL(dbUrl);
} catch (e) {
  console.error("❌ Failed to parse DATABASE_URL as a valid URL.");
  process.exit(1);
}

const hostname = parsedUrl.hostname.toLowerCase();
const allowedLocalHosts = ["localhost", "127.0.0.1", "::1"];

if (!allowedLocalHosts.includes(hostname)) {
  console.error("\n" + "=".repeat(70));
  console.error("🛑 CRITICAL SAFETY KILL-SWITCH ACTIVATED!");
  console.error(`Target host detected: "${hostname}"`);
  console.error("Database seeding is restricted strictly to local development (localhost).");
  console.error("Operation aborted immediately to protect remote/production databases.");
  console.error("=".repeat(70) + "\n");
  process.exit(1);
}

const pool = new Pool({
  connectionString: dbUrl,
  ssl: false
});

async function runSeed() {
  console.log("\n🌱 Starting safe local database initialization & seeding...");
  console.log(`📡 Connected to target host: ${hostname}:${parsedUrl.port || 5432}`);
  
  const client = await pool.connect();
  try {
    // 1. Run Schema DDL
    const schemaPath = path.join(__dirname, "../src/db/schema.sql");
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found at ${schemaPath}`);
    }
    const schemaSql = fs.readFileSync(schemaPath, "utf8");
    console.log("📄 Applying schema DDL (extensions, tables, indexes)...");
    await client.query(schemaSql);
    console.log("✅ Schema DDL applied successfully.");

    // 2. Clear tables to ensure fresh predictable demo data
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND table_name NOT IN ('spatial_ref_sys', 'geography_columns', 'geometry_columns')
      ORDER BY table_name;
    `);
    const tableNames = tablesRes.rows.map(r => r.table_name);
    if (tableNames.length > 0) {
      await client.query(`TRUNCATE TABLE ${tableNames.map(t => `"${t}"`).join(", ")} CASCADE;`);
      console.log(`🧹 Reset ${tableNames.length} tables for clean deterministic seeding.`);
    }

    // Default test password: "Test@1234"
    const passwordHash = await bcrypt.hash("Test@1234", 10);

    // 3. Insert Demo Households & Members
    console.log("👨‍👩‍👧‍👦 Populating demo households across canonical Gotras...");

    const demoData = [
      {
        householdCode: "AGR-2026-001",
        serialNo: "SN-001",
        headName: "Rajesh Kumar Agarwal",
        nativePlace: "Agroha, Haryana",
        gotra: "Garg",
        country: "Singapore",
        city: "Singapore",
        state: "Central Region",
        postalCode: "238801",
        fullAddress: "15 Orchard Boulevard, #12-04, Singapore 238801",
        verifiedContact: "+6591234567",
        status: "live",
        members: [
          {
            fullName: "Rajesh Kumar Agarwal",
            relation: "self",
            dob: "1978-04-12",
            gender: "male",
            maritalStatus: "married",
            profession: "Chief Technology Officer",
            professionTitle: "CTO & Co-founder",
            professionCategory: "Technology",
            phone: "+6591234567",
            email: "rajesh.agarwal@example.com",
            currentCity: "Singapore",
            currentCountry: "Singapore",
            lat: 1.3048,
            lng: 103.8318,
            serialNo: "MEM-001-A",
            visibility: { contact: "public_to_members", dob: "members_only", photo: "public_to_members" }
          },
          {
            fullName: "Sunita Agarwal",
            relation: "spouse",
            dob: "1982-08-25",
            gender: "female",
            maritalStatus: "married",
            profession: "Financial Director",
            professionTitle: "Managing Director",
            professionCategory: "Finance",
            phone: "+6591234568",
            email: "sunita.agarwal@example.com",
            currentCity: "Singapore",
            currentCountry: "Singapore",
            lat: 1.3048,
            lng: 103.8318,
            serialNo: "MEM-001-B",
            visibility: { contact: "members_only", dob: "hidden", photo: "public_to_members" }
          },
          {
            fullName: "Aarav Agarwal",
            relation: "son",
            dob: "2006-11-14",
            gender: "male",
            maritalStatus: "unmarried",
            profession: "Undergraduate Student",
            professionTitle: "Computer Science Student",
            professionCategory: "Education",
            phone: "+6591234569",
            email: "aarav.agarwal@example.com",
            currentCity: "Singapore",
            currentCountry: "Singapore",
            lat: 1.3048,
            lng: 103.8318,
            serialNo: "MEM-001-C",
            visibility: { contact: "members_only", dob: "members_only", photo: "public_to_members" }
          }
        ]
      },
      {
        householdCode: "AGR-2026-002",
        serialNo: "SN-002",
        headName: "Vikram Bansal",
        nativePlace: "Hisar, Haryana",
        gotra: "Bansal",
        country: "India",
        city: "New Delhi",
        state: "Delhi",
        postalCode: "110001",
        fullAddress: "42 Barakhamba Road, Connaught Place, New Delhi",
        verifiedContact: "+919810012345",
        status: "live",
        members: [
          {
            fullName: "Vikram Bansal",
            relation: "self",
            dob: "1972-01-19",
            gender: "male",
            maritalStatus: "married",
            profession: "Senior Advocate",
            professionTitle: "Supreme Court Advocate",
            professionCategory: "Legal",
            phone: "+919810012345",
            email: "vikram.bansal@example.com",
            currentCity: "New Delhi",
            currentCountry: "India",
            lat: 28.6289,
            lng: 77.2219,
            serialNo: "MEM-002-A",
            visibility: { contact: "public_to_members", dob: "hidden", photo: "public_to_members" }
          },
          {
            fullName: "Pooja Bansal",
            relation: "spouse",
            dob: "1975-06-10",
            gender: "female",
            maritalStatus: "married",
            profession: "Pediatrician",
            professionTitle: "Senior Consultant",
            professionCategory: "Healthcare",
            phone: "+919810012346",
            email: "pooja.bansal@example.com",
            currentCity: "New Delhi",
            currentCountry: "India",
            lat: 28.6289,
            lng: 77.2219,
            serialNo: "MEM-002-B",
            visibility: { contact: "members_only", dob: "hidden", photo: "public_to_members" }
          },
          {
            fullName: "Ananya Bansal",
            relation: "daughter",
            dob: "2001-03-22",
            gender: "female",
            maritalStatus: "unmarried",
            profession: "Product Designer",
            professionTitle: "Senior UX Designer",
            professionCategory: "Design",
            phone: "+919810012347",
            email: "ananya.bansal@example.com",
            currentCity: "New Delhi",
            currentCountry: "India",
            lat: 28.6289,
            lng: 77.2219,
            serialNo: "MEM-002-C",
            visibility: { contact: "public_to_members", dob: "members_only", photo: "public_to_members" }
          }
        ]
      },
      {
        householdCode: "AGR-2026-003",
        serialNo: "SN-003",
        headName: "Anil Goyal",
        nativePlace: "Jaipur, Rajasthan",
        gotra: "Goyal",
        country: "India",
        city: "Mumbai",
        state: "Maharashtra",
        postalCode: "400050",
        fullAddress: "Flat 801, Sea View Towers, Bandra West, Mumbai",
        verifiedContact: "+919820054321",
        status: "live",
        members: [
          {
            fullName: "Anil Goyal",
            relation: "self",
            dob: "1968-09-30",
            gender: "male",
            maritalStatus: "married",
            profession: "Industrialist",
            professionTitle: "Chairman & Managing Director",
            professionCategory: "Manufacturing",
            phone: "+919820054321",
            email: "anil.goyal@example.com",
            currentCity: "Mumbai",
            currentCountry: "India",
            lat: 19.0596,
            lng: 72.8295,
            serialNo: "MEM-003-A",
            visibility: { contact: "public_to_members", dob: "hidden", photo: "public_to_members" }
          },
          {
            fullName: "Kavita Goyal",
            relation: "spouse",
            dob: "1971-12-05",
            gender: "female",
            maritalStatus: "married",
            profession: "Interior Architect",
            professionTitle: "Design Principal",
            professionCategory: "Architecture",
            phone: "+919820054322",
            email: "kavita.goyal@example.com",
            currentCity: "Mumbai",
            currentCountry: "India",
            lat: 19.0596,
            lng: 72.8295,
            serialNo: "MEM-003-B",
            visibility: { contact: "members_only", dob: "hidden", photo: "public_to_members" }
          }
        ]
      },
      {
        householdCode: "AGR-2026-004",
        serialNo: "SN-004",
        headName: "Deepak Mittal",
        nativePlace: "Bhiwani, Haryana",
        gotra: "Mittal",
        country: "Singapore",
        city: "Singapore",
        state: "East Region",
        postalCode: "437437",
        fullAddress: "10 Tanjong Rhu Road, Pebble Bay, Singapore",
        verifiedContact: "+6598765432",
        status: "live",
        members: [
          {
            fullName: "Deepak Mittal",
            relation: "self",
            dob: "1985-02-14",
            gender: "male",
            maritalStatus: "married",
            profession: "Investment Banker",
            professionTitle: "Executive Director",
            professionCategory: "Finance",
            phone: "+6598765432",
            email: "deepak.mittal@example.com",
            currentCity: "Singapore",
            currentCountry: "Singapore",
            lat: 1.3005,
            lng: 103.8762,
            serialNo: "MEM-004-A",
            visibility: { contact: "public_to_members", dob: "members_only", photo: "public_to_members" }
          }
        ]
      },
      {
        householdCode: "AGR-2026-005",
        serialNo: "SN-005",
        headName: "Sanjay Jindal",
        nativePlace: "Rohtak, Haryana",
        gotra: "Jindal",
        country: "United Arab Emirates",
        city: "Dubai",
        state: "Dubai",
        postalCode: "00000",
        fullAddress: "Downtown Dubai, Sheikh Mohammed bin Rashid Blvd",
        verifiedContact: "+971501234567",
        status: "pending_review",
        members: [
          {
            fullName: "Sanjay Jindal",
            relation: "self",
            dob: "1980-07-04",
            gender: "male",
            maritalStatus: "married",
            profession: "Chartered Accountant",
            professionTitle: "Senior Partner",
            professionCategory: "Consulting",
            phone: "+971501234567",
            email: "sanjay.jindal@example.com",
            currentCity: "Dubai",
            currentCountry: "United Arab Emirates",
            lat: 25.1972,
            lng: 55.2744,
            serialNo: "MEM-005-A",
            visibility: { contact: "members_only", dob: "hidden", photo: "public_to_members" }
          }
        ]
      }
    ];

    for (const h of demoData) {
      // Create household
      const headUserRes = await client.query("SELECT uuid_generate_v4() as id;");
      const headUserId = headUserRes.rows[0].id;

      const hRes = await client.query(`
        INSERT INTO households (
          household_code, serial_no, head_user_id, head_name, native_place, gotra,
          country, postal_code, state, city, full_address, verified_contact,
          status, consent_accepted_at, password_hash
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), $14
        ) RETURNING id;
      `, [
        h.householdCode, h.serialNo, headUserId, h.headName, h.nativePlace, h.gotra,
        h.country, h.postalCode, h.state, h.city, h.fullAddress, h.verifiedContact,
        h.status, passwordHash
      ]);

      const householdId = hRes.rows[0].id;

      for (const m of h.members) {
        await client.query(`
          INSERT INTO members (
            household_id, full_name, relation_to_head, dob, gender, marital_status,
            current_city, current_country, postal_code, state, full_address,
            coordinates, profession_freetext, profession_title, profession_category,
            phone, email, password_hash, serial_no, verified_by_self,
            visibility_contact, visibility_dob, visibility_photo
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
            ST_SetSRID(ST_MakePoint($12, $13), 4326)::geography,
            $14, $15, $16, $17, $18, $19, $20, TRUE,
            $21, $22, $23
          );
        `, [
          householdId, m.fullName, m.relation, m.dob, m.gender, m.maritalStatus,
          m.currentCity, m.currentCountry, m.postalCode || h.postalCode, m.state || h.state, m.fullAddress || h.fullAddress,
          m.lng, m.lat,
          m.profession, m.professionTitle, m.professionCategory,
          m.phone, m.email, passwordHash, m.serialNo,
          m.visibility.contact, m.visibility.dob, m.visibility.photo
        ]);
      }
    }

    // 4. Sample Support Inquiry
    await client.query(`
      INSERT INTO support_inquiries (ticket_id, name, email, category, message, status)
      VALUES 
      ('TICK-2026-001', 'Anil Goyal', 'anil.goyal@example.com', 'Directory Update', 'Please help update my secondary residential address.', 'open');
    `);

    console.log("✅ Seed completed successfully!");
    console.log("\n" + "=".repeat(60));
    console.log("🎉 DEMO ENVIRONMENT READY FOR TESTING");
    console.log("============================================================");
    console.log("🔐 Test Account Login Credentials:");
    console.log("   Phone:      +6591234567  (Rajesh Kumar Agarwal - Singapore)");
    console.log("   Phone:      +919810012345 (Vikram Bansal - New Delhi)");
    console.log("   Password:   Test@1234");
    console.log("   Admin Pwd:  admin_test_password_123");
    console.log("=".repeat(60) + "\n");

  } catch (err) {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runSeed();
