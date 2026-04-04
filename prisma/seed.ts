import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const SALT_ROUNDS = 10;

async function main() {
  console.log('🌱  Seeding database...\n');

  // Clean existing seed data (idempotent)
  await prisma.refreshToken.deleteMany();
  await prisma.financialRecord.deleteMany();
  await prisma.user.deleteMany();

  // ── Users ────────────────────────────────────────────────────────────────

  const adminHash = await bcrypt.hash('Admin@123', SALT_ROUNDS);
  const analystHash = await bcrypt.hash('Analyst@123', SALT_ROUNDS);
  const viewerHash = await bcrypt.hash('Viewer@123', SALT_ROUNDS);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@zorvyn.com',
      passwordHash: adminHash,
      name: 'Alice Admin',
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  const analyst = await prisma.user.create({
    data: {
      email: 'analyst@zorvyn.com',
      passwordHash: analystHash,
      name: 'Bob Analyst',
      role: 'ANALYST',
      status: 'ACTIVE',
    },
  });

  const viewer = await prisma.user.create({
    data: {
      email: 'viewer@zorvyn.com',
      passwordHash: viewerHash,
      name: 'Carol Viewer',
      role: 'VIEWER',
      status: 'ACTIVE',
    },
  });

  // ── Financial Records ─────────────────────────────────────────────────────

  const now = new Date();
  const months = (n: number) => new Date(now.getFullYear(), now.getMonth() - n, 15);

  const records = [
    { amount: 85000, type: 'INCOME',  category: 'Salary',        date: months(0), notes: 'Monthly salary — April',         userId: admin.id },
    { amount: 12000, type: 'INCOME',  category: 'Freelance',     date: months(0), notes: 'UI design contract payment',     userId: analyst.id },
    { amount: 3200,  type: 'EXPENSE', category: 'Rent',          date: months(0), notes: 'Office space — April',           userId: admin.id },
    { amount: 1500,  type: 'EXPENSE', category: 'Utilities',     date: months(0), notes: 'Electricity + internet',         userId: admin.id },
    { amount: 4500,  type: 'EXPENSE', category: 'Software',      date: months(0), notes: 'SaaS subscriptions',             userId: analyst.id },
    { amount: 78000, type: 'INCOME',  category: 'Salary',        date: months(1), notes: 'Monthly salary — March',        userId: admin.id },
    { amount: 9500,  type: 'INCOME',  category: 'Consultancy',   date: months(1), notes: 'Strategy consulting session',   userId: analyst.id },
    { amount: 3200,  type: 'EXPENSE', category: 'Rent',          date: months(1), notes: 'Office space — March',          userId: admin.id },
    { amount: 2100,  type: 'EXPENSE', category: 'Marketing',     date: months(1), notes: 'LinkedIn ads campaign',         userId: admin.id },
    { amount: 6800,  type: 'EXPENSE', category: 'Equipment',     date: months(1), notes: 'New MacBook Pro',               userId: admin.id },
    { amount: 85000, type: 'INCOME',  category: 'Salary',        date: months(2), notes: 'Monthly salary — February',    userId: admin.id },
    { amount: 15000, type: 'INCOME',  category: 'Investment',    date: months(2), notes: 'Dividends received',            userId: admin.id },
    { amount: 3200,  type: 'EXPENSE', category: 'Rent',          date: months(2), notes: 'Office space — February',      userId: admin.id },
    { amount: 890,   type: 'EXPENSE', category: 'Utilities',     date: months(2), notes: 'Water + electricity',           userId: admin.id },
    { amount: 2500,  type: 'EXPENSE', category: 'Travel',        date: months(2), notes: 'Client visit — Bangalore',     userId: analyst.id },
    { amount: 70000, type: 'INCOME',  category: 'Salary',        date: months(3), notes: 'Monthly salary — January',     userId: admin.id },
    { amount: 5000,  type: 'INCOME',  category: 'Freelance',     date: months(3), notes: 'Logo design project',          userId: analyst.id },
    { amount: 3200,  type: 'EXPENSE', category: 'Rent',          date: months(3), notes: 'Office space — January',       userId: admin.id },
    { amount: 1200,  type: 'EXPENSE', category: 'Software',      date: months(3), notes: 'Annual license renewals',      userId: analyst.id },
    { amount: 3800,  type: 'EXPENSE', category: 'Marketing',     date: months(3), notes: 'Google Ads — Q1',              userId: admin.id },
    // A soft-deleted record to demonstrate the feature
    { amount: 500,   type: 'EXPENSE', category: 'Miscellaneous', date: months(0), notes: 'Incorrectly entered — deleted', userId: admin.id, deletedAt: now },
  ];

  for (const record of records) {
    await prisma.financialRecord.create({ data: record });
  }

  console.log('✅  Seed complete!\n');
  console.log('─'.repeat(50));
  console.log('  Seeded accounts (use these to log in):\n');
  console.log('  Role     │ Email                    │ Password');
  console.log('  ─────────┼──────────────────────────┼──────────────');
  console.log('  ADMIN    │ admin@zorvyn.com          │ Admin@123');
  console.log('  ANALYST  │ analyst@zorvyn.com        │ Analyst@123');
  console.log('  VIEWER   │ viewer@zorvyn.com         │ Viewer@123');
  console.log('─'.repeat(50));
  console.log('\n  Seeded 20 active + 1 soft-deleted financial records');
  console.log('  API Docs → http://localhost:3000/api/docs\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
