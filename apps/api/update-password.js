const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const db = new Pool({
  connectionString: 'postgresql://crm_user:crm@postgres:5432/crm_dev',
});

async function updatePassword() {
  try {
    const newPassword = 'Admin12345';
    const hash = await bcrypt.hash(newPassword, 12);
    
    const result = await db.query(
      'UPDATE users SET "passwordHash" = $1 WHERE email = $2 RETURNING email',
      [hash, 'admin@demo.com']
    );
    
    console.log('✅ Password updated successfully!');
    console.log('Updated user:', result.rows[0]?.email);
    console.log('New password:', newPassword);
    
    // Verify
    const verify = await bcrypt.compare(newPassword, hash);
    console.log('Password verification test:', verify);
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await db.end();
  }
}

updatePassword();

