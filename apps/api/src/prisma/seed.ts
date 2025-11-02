/**
 * Database seed script
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create organization
  const organization = await prisma.organization.create({
    data: {
      name: 'Demo Organization',
      subscriptionTier: 'ENTERPRISE',
      maxUsers: 100,
    },
  });

  console.log('✅ Created organization:', organization.name);

  // Create admin user
  const hashedPassword = await bcrypt.hash('Admin123!@#$', 12);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@demo.com',
      passwordHash: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      organizationId: organization.id,
      isActive: true,
    },
  });

  console.log('✅ Created admin user:', admin.email);

  // Create test manager
  const manager = await prisma.user.create({
    data: {
      email: 'manager@demo.com',
      passwordHash: hashedPassword,
      firstName: 'Manager',
      lastName: 'User',
      role: 'MANAGER',
      organizationId: organization.id,
      isActive: true,
    },
  });

  console.log('✅ Created manager user:', manager.email);

  // Create default pipeline
  await prisma.pipeline.create({
    data: {
      name: 'Default Sales Pipeline',
      isDefault: true,
      organizationId: organization.id,
      createdBy: admin.id,
      stages: [
        { id: '1', name: 'Lead', order: 1, probability: 10 },
        { id: '2', name: 'Qualified', order: 2, probability: 30 },
        { id: '3', name: 'Proposal', order: 3, probability: 50 },
        { id: '4', name: 'Negotiation', order: 4, probability: 70 },
        { id: '5', name: 'Closed Won', order: 5, probability: 100 },
        { id: '6', name: 'Closed Lost', order: 6, probability: 0 },
      ],
    },
  });

  console.log('✅ Created default pipeline');

  // Create sample customer
  const customer = await prisma.customer.create({
    data: {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '+1234567890',
      company: 'Acme Corp',
      tags: ['enterprise', 'priority'],
      organizationId: organization.id,
      createdBy: admin.id,
    },
  });

  console.log('✅ Created sample customer:', customer.email);

  console.log('\n✨ Database seeded successfully!');
  console.log('\n📝 Login credentials:');
  console.log('   Admin: admin@demo.com / Admin123!@#$');
  console.log('   Manager: manager@demo.com / Admin123!@#$');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

