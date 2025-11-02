// Test simple pg connection
require('dotenv').config({ path: '.env' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function test() {
  try {
    console.log('Testing database connection...');
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Missing');
    
    const result = await pool.query('SELECT 1 as test, current_database(), current_user');
    console.log('✅ Connection successful!', result.rows[0]);
    
    // Test a real query
    const users = await pool.query('SELECT email, role FROM users LIMIT 5');
    console.log('✅ Users query successful!', users.rows);
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    await pool.end();
    process.exit(1);
  }
}

test();

