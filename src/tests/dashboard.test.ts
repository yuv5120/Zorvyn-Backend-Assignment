import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../app';
import { prisma } from '../config/prisma';



let adminToken: string;
let analystToken: string;
let viewerToken: string;

async function getToken(email: string, password: string): Promise<string> {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.body.data.accessToken;
}

beforeAll(async () => {
  await prisma.refreshToken.deleteMany();
  await prisma.financialRecord.deleteMany();
  await prisma.user.deleteMany();

  const bcrypt = await import('bcrypt');
  const hash = (pw: string) => bcrypt.hash(pw, 10);

  const admin = await prisma.user.create({
    data: {
      email: 'dash-admin@test.com',
      passwordHash: await hash('Admin@123'),
      name: 'Admin',
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });
  const analyst = await prisma.user.create({
    data: {
      email: 'dash-analyst@test.com',
      passwordHash: await hash('Analyst@123'),
      name: 'Analyst',
      role: 'ANALYST',
      status: 'ACTIVE',
    },
  });
  await prisma.user.create({
    data: {
      email: 'dash-viewer@test.com',
      passwordHash: await hash('Viewer@123'),
      name: 'Viewer',
      role: 'VIEWER',
      status: 'ACTIVE',
    },
  });

  // Seed known records for deterministic analytics tests
  const now = new Date();
  await prisma.financialRecord.createMany({
    data: [
      { amount: 10000, type: 'INCOME',  category: 'Salary',   date: now, userId: admin.id },
      { amount: 5000,  type: 'INCOME',  category: 'Freelance', date: now, userId: analyst.id },
      { amount: 2000,  type: 'EXPENSE', category: 'Rent',      date: now, userId: admin.id },
      { amount: 500,   type: 'EXPENSE', category: 'Utilities', date: now, userId: admin.id },
      // Soft-deleted — must NOT appear in analytics
      { amount: 99999, type: 'INCOME',  category: 'Ghost',    date: now, userId: admin.id, deletedAt: now },
    ],
  });

  adminToken = await getToken('dash-admin@test.com', 'Admin@123');
  analystToken = await getToken('dash-analyst@test.com', 'Analyst@123');
  viewerToken = await getToken('dash-viewer@test.com', 'Viewer@123');
});

afterAll(async () => {
  await prisma.refreshToken.deleteMany();
  await prisma.financialRecord.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});



describe('GET /api/dashboard/summary', () => {
  it('returns correct totals for all roles', async () => {
    for (const token of [adminToken, analystToken, viewerToken]) {
      const res = await request(app)
        .get('/api/dashboard/summary')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);

      const { totalIncome, totalExpenses, netBalance } = res.body.data;
      // 10000 + 5000 = 15000 income; 2000 + 500 = 2500 expense
      expect(totalIncome).toBe(15000);
      expect(totalExpenses).toBe(2500);
      expect(netBalance).toBe(12500);
    }
  });

  it('does NOT include soft-deleted records in totals', async () => {
    const res = await request(app)
      .get('/api/dashboard/summary')
      .set('Authorization', `Bearer ${adminToken}`);
    // If the Ghost record (99999) was included, income would be 114999
    expect(res.body.data.totalIncome).toBe(15000);
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/dashboard/summary');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/dashboard/by-category', () => {
  it('returns category breakdown (200)', async () => {
    const res = await request(app)
      .get('/api/dashboard/by-category')
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);

    const salaryEntry = res.body.data.find((c: { category: string }) => c.category === 'Salary');
    expect(salaryEntry).toBeDefined();
    expect(salaryEntry.income).toBe(10000);
  });
});

describe('GET /api/dashboard/trends', () => {
  it('allows ANALYST to access trends (200)', async () => {
    const res = await request(app)
      .get('/api/dashboard/trends?months=3')
      .set('Authorization', `Bearer ${analystToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('allows ADMIN to access trends (200)', async () => {
    const res = await request(app)
      .get('/api/dashboard/trends')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  it('blocks VIEWER from accessing trends (403)', async () => {
    const res = await request(app)
      .get('/api/dashboard/trends')
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(403);
  });
});

describe('GET /api/dashboard/recent', () => {
  it('returns recent activity for VIEWER (200)', async () => {
    const res = await request(app)
      .get('/api/dashboard/recent?limit=5')
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeLessThanOrEqual(5);
  });

  it('does NOT include soft-deleted records in recent activity', async () => {
    const res = await request(app)
      .get('/api/dashboard/recent?limit=50')
      .set('Authorization', `Bearer ${adminToken}`);
    const categories = res.body.data.map((r: { category: string }) => r.category);
    expect(categories).not.toContain('Ghost');
  });
});
