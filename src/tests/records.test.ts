import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../app';
import { prisma } from '../config/prisma';



async function getToken(email: string, password: string): Promise<string> {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.body.data.accessToken;
}



let adminToken: string;
let analystToken: string;
let viewerToken: string;
let createdRecordId: string;

beforeAll(async () => {
  await prisma.refreshToken.deleteMany();
  await prisma.financialRecord.deleteMany();
  await prisma.user.deleteMany();

  // Create one user of each role
  const bcrypt = await import('bcrypt');
  const hash = (pw: string) => bcrypt.hash(pw, 10);

  await prisma.user.create({
    data: {
      email: 'admin@test.com',
      passwordHash: await hash('Admin@123'),
      name: 'Admin',
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });
  await prisma.user.create({
    data: {
      email: 'analyst@test.com',
      passwordHash: await hash('Analyst@123'),
      name: 'Analyst',
      role: 'ANALYST',
      status: 'ACTIVE',
    },
  });
  await prisma.user.create({
    data: {
      email: 'viewer@test.com',
      passwordHash: await hash('Viewer@123'),
      name: 'Viewer',
      role: 'VIEWER',
      status: 'ACTIVE',
    },
  });

  adminToken = await getToken('admin@test.com', 'Admin@123');
  analystToken = await getToken('analyst@test.com', 'Analyst@123');
  viewerToken = await getToken('viewer@test.com', 'Viewer@123');
});

afterAll(async () => {
  await prisma.refreshToken.deleteMany();
  await prisma.financialRecord.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});



describe('POST /api/records — create', () => {
  it('allows ANALYST to create a record (201)', async () => {
    const res = await request(app)
      .post('/api/records')
      .set('Authorization', `Bearer ${analystToken}`)
      .send({
        amount: 5000,
        type: 'INCOME',
        category: 'Salary',
        date: '2024-01-15',
        notes: 'January salary',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.amount).toBe(5000);
    createdRecordId = res.body.data.id;
  });

  it('allows ADMIN to create a record (201)', async () => {
    const res = await request(app)
      .post('/api/records')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ amount: 1200, type: 'EXPENSE', category: 'Rent', date: '2024-01-01' });
    expect(res.status).toBe(201);
  });

  it('blocks VIEWER from creating a record (403)', async () => {
    const res = await request(app)
      .post('/api/records')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ amount: 100, type: 'INCOME', category: 'Test', date: '2024-01-01' });
    expect(res.status).toBe(403);
  });

  it('returns 400 on missing required fields', async () => {
    const res = await request(app)
      .post('/api/records')
      .set('Authorization', `Bearer ${analystToken}`)
      .send({ amount: 100 }); // missing type, category, date
    expect(res.status).toBe(400);
    expect(res.body.error.details).toBeDefined();
  });

  it('returns 400 on negative amount', async () => {
    const res = await request(app)
      .post('/api/records')
      .set('Authorization', `Bearer ${analystToken}`)
      .send({ amount: -100, type: 'INCOME', category: 'Test', date: '2024-01-01' });
    expect(res.status).toBe(400);
  });

  it('returns 401 with no token', async () => {
    const res = await request(app).post('/api/records').send({
      amount: 100,
      type: 'INCOME',
      category: 'Test',
      date: '2024-01-01',
    });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/records — list & filter', () => {
  it('returns records for VIEWER (200)', async () => {
    const res = await request(app)
      .get('/api/records')
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toMatchObject({ page: 1, limit: 20 });
  });

  it('filters by type=INCOME', async () => {
    const res = await request(app)
      .get('/api/records?type=INCOME')
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(200);
    res.body.data.forEach((r: { type: string }) => expect(r.type).toBe('INCOME'));
  });

  it('filters by category', async () => {
    const res = await request(app)
      .get('/api/records?category=Salary')
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(200);
  });

  it('searches by notes keyword', async () => {
    const res = await request(app)
      .get('/api/records?search=January')
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('paginates correctly', async () => {
    const res = await request(app)
      .get('/api/records?page=1&limit=1')
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.meta.limit).toBe(1);
  });

  it('returns 400 on invalid type filter', async () => {
    const res = await request(app)
      .get('/api/records?type=INVALID')
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/records/:id — update', () => {
  it('allows ANALYST to update their own record', async () => {
    const res = await request(app)
      .patch(`/api/records/${createdRecordId}`)
      .set('Authorization', `Bearer ${analystToken}`)
      .send({ amount: 6000, notes: 'Updated salary' });
    expect(res.status).toBe(200);
    expect(res.body.data.amount).toBe(6000);
  });

  it('blocks VIEWER from updating (403)', async () => {
    const res = await request(app)
      .patch(`/api/records/${createdRecordId}`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ amount: 100 });
    expect(res.status).toBe(403);
  });

  it('returns 404 on non-existent record', async () => {
    const res = await request(app)
      .patch('/api/records/nonexistent-id')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ amount: 100 });
    expect(res.status).toBe(404);
  });

  it('returns 400 on empty update body', async () => {
    const res = await request(app)
      .patch(`/api/records/${createdRecordId}`)
      .set('Authorization', `Bearer ${analystToken}`)
      .send({});
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/records/:id — soft delete', () => {
  it('blocks ANALYST from deleting (403)', async () => {
    const res = await request(app)
      .delete(`/api/records/${createdRecordId}`)
      .set('Authorization', `Bearer ${analystToken}`);
    expect(res.status).toBe(403);
  });

  it('allows ADMIN to soft-delete a record (200)', async () => {
    const res = await request(app)
      .delete(`/api/records/${createdRecordId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.deletedAt).toBeDefined();
  });

  it('soft-deleted record no longer appears in GET /api/records', async () => {
    const res = await request(app)
      .get('/api/records')
      .set('Authorization', `Bearer ${viewerToken}`);
    const ids = res.body.data.map((r: { id: string }) => r.id);
    expect(ids).not.toContain(createdRecordId);
  });

  it('soft-deleted record no longer accessible via GET /api/records/:id', async () => {
    const res = await request(app)
      .get(`/api/records/${createdRecordId}`)
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(404);
  });
});
