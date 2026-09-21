// quick-check-schema.cjs
const pg = require('pg');
const url = process.env.DATABASE_URL
  ? process.env.DATABASE_URL.replace('?pgbouncer=true', '')
  : 'postgresql://localhost:5432/agrawal_dev';

const c = new pg.Client({ connectionString: url });
c.connect().then(async () => {
  const r = await c.query("SELECT column_name FROM information_schema.columns WHERE table_name='members' ORDER BY ordinal_position");
  console.log('Members columns:', r.rows.map(x => x.column_name).join(', '));

  const m = await c.query(`
    SELECT m.id, m.full_name, m.email, m.serial_no, m.current_city, h.gotra, h.native_place
    FROM members m
    LEFT JOIN households h ON h.id = m.household_id
    WHERE m.serial_no = '150' LIMIT 1
  `);
  console.log('Member 150:', JSON.stringify(m.rows[0]));

  const a = await c.query(`SELECT id, full_name, email, serial_no FROM members WHERE email = 'aayushmittal620@gmail.com' LIMIT 1`);
  console.log('Aayush:', JSON.stringify(a.rows[0]));
  await c.end();
}).catch(e => { console.error(e.message); process.exit(1); });
