// check-member-150-prod.cjs
const pg = require('pg');
const url = process.env.DATABASE_URL.replace('?pgbouncer=true', '');
const c = new pg.Client({ connectionString: url });

c.connect().then(async () => {
  const r = await c.query(`
    SELECT
      m.id, m.full_name, m.email, m.phone, m.serial_no, m.father_name,
      m.dob, m.current_city, m.state, m.postal_code, m.full_address,
      m.profession_freetext, m.profession_title,
      m.aadhaar_number, m.pan_number, m.photo_url,
      h.head_name, h.gotra, h.native_place, h.city AS household_city, h.verified_contact
    FROM members m
    LEFT JOIN households h ON h.id = m.household_id
    WHERE m.serial_no = 'MAFL-000-000-150'
    LIMIT 1
  `);
  if (!r.rows[0]) { console.log('❌ Member 150 not found'); }
  else { console.log(JSON.stringify(r.rows[0], null, 2)); }
  await c.end();
}).catch(e => { console.error(e.message); process.exit(1); });
