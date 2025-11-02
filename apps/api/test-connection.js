// Quick test to see if Prisma can connect
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
});

async function test() {
  try {
    console.log('Testing database connection...');
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Missing');
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Connection successful!', result);
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

test();

