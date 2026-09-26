import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgres://postgres:postgres@127.0.0.1:5432/agrawal_dev',
});

async function seed() {
  try {
    // 1. Update photo_url on Rajesh
    await pool.query(`
      UPDATE members 
      SET photo_url = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80'
      WHERE id = '99cc8484-f939-420c-ab37-3548a0b4d729'
    `);

    // Clean existing
    await pool.query(`DELETE FROM career_profiles WHERE member_id IN ('99cc8484-f939-420c-ab37-3548a0b4d729', 'f9423b4a-7333-4129-bbd4-fbeeec80c529')`);

    // 2. Insert Rajesh profile (with photo, with portfolio github.com without https://)
    const sql1 = `
      INSERT INTO career_profiles (
        household_id, member_id, headline, current_company, current_designation, primary_domain,
        career_level, years_of_experience, skills, preferred_locations,
        seeking_status, workplace_preference, bio, portfolio_url, linkedin_url,
        is_confidential_mode, is_mentor_available, status
      ) VALUES (
        (SELECT household_id FROM members WHERE id = $1),
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
      ) RETURNING id, headline;
    `;
    const res1 = await pool.query(sql1, [
      '99cc8484-f939-420c-ab37-3548a0b4d729',
      'Principal Cloud Architect & AI Engineer',
      'Agarwal Enterprise Solutions',
      'VP of Engineering',
      'Technology & Software',
      'leadership',
      14,
      ['Cloud Architecture', 'Next.js', 'PostgreSQL', 'AI Systems', 'Kubernetes'],
      ['Bengaluru', 'Remote', 'Delhi NCR'],
      'open_to_offers',
      'remote_only',
      'Experienced tech leader driving modern cloud transformations and mentoring aspiring Agarwal technologists.',
      'github.com/rajesh-agarwal',
      'linkedin.com/in/rajesh-agarwal',
      false,
      true,
      'live'
    ]);
    console.log('Seeded Rajesh profile:', res1.rows[0]);

    // 3. Insert Sunita profile (no photo -> testing initial avatar fallback)
    const res2 = await pool.query(sql1, [
      'f9423b4a-7333-4129-bbd4-fbeeec80c529',
      'Chartered Accountant & Financial Strategist',
      'Bansal & Associates CA',
      'Senior Partner',
      'Finance & Banking',
      'mid_level',
      8,
      ['Corporate Tax', 'Auditing', 'GST Compliance', 'Wealth Advisory'],
      ['Mumbai', 'Jaipur'],
      'actively_looking',
      'hybrid',
      'Specializing in tax planning and financial restructuring for high-growth enterprises.',
      'ca-sunita-agarwal.in',
      'linkedin.com/in/sunita-ca',
      false,
      false,
      'live'
    ]);
    console.log('Seeded Sunita profile:', res2.rows[0]);
  } finally {
    await pool.end();
  }
}

seed();
