/**
 * Script to fix admin password in database
 * This will update the password hash for admin@demo.com to use a known working password
 */

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const db = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://crm_user:crm@postgres:5432/crm_dev',
});

const NEW_PASSWORD = 'Admin12345';

async function fixPassword() {
  try {
    console.log('🔧 Fixing admin password...');
    
    // Generate new hash
    console.log('📝 Generating password hash...');
    const hash = await bcrypt.hash(NEW_PASSWORD, 12);
    console.log('✅ Hash generated:', hash.substring(0, 30) + '...');
    
    // Verify the hash works
    const verify = await bcrypt.compare(NEW_PASSWORD, hash);
    console.log('✅ Hash verification test:', verify ? 'PASSED' : 'FAILED');
    
    if (!verify) {
      throw new Error('Hash verification failed - cannot proceed');
    }
    
    // Update database
    console.log('\n💾 Updating database...');
    const result = await db.query(
      `UPDATE users 
       SET "passwordHash" = $1, "updatedAt" = NOW() 
       WHERE email = $2 
       RETURNING email, "firstName", "lastName", role`,
      [hash, 'admin@demo.com']
    );
    
    if (result.rows.length === 0) {
      throw new Error('User not found: admin@demo.com');
    }
    
    console.log('✅ Password updated successfully!');
    console.log('\n📋 Updated user:');
    console.log('   Email:', result.rows[0].email);
    console.log('   Name:', `${result.rows[0].firstName} ${result.rows[0].lastName}`);
    console.log('   Role:', result.rows[0].role);
    
    // Verify the update worked
    console.log('\n🔍 Verifying database update...');
    const verifyResult = await db.query(
      'SELECT "passwordHash" FROM users WHERE email = $1',
      ['admin@demo.com']
    );
    
    const storedHash = verifyResult.rows[0]?.passwordHash;
    const finalVerify = await bcrypt.compare(NEW_PASSWORD, storedHash);
    
    if (finalVerify) {
      console.log('✅ Database verification: PASSED');
    } else {
      throw new Error('Database verification: FAILED - hash mismatch');
    }
    
    console.log('\n✨ Password fix completed successfully!');
    console.log('\n📝 Login credentials:');
    console.log('   Email: admin@demo.com');
    console.log('   Password: Admin12345');
    console.log('\n🚀 You can now test login at: http://localhost:4000/api/auth/login');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    await db.end();
  }
}

fixPassword();

