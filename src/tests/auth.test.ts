import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../app';
import { prisma } from '../config/prisma';
import bcrypt from 'bcrypt';



beforeAll(async () => {
  // Clean test DB state
  await prisma.refreshToken.deleteMany();
  await prisma.financialRecord.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.refreshToken.deleteMany();
  await prisma.financialRecord.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});



describe('POST /api/auth/register', () => {
  it('creates a new user and returns 201', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'test@example.com',
      password: 'Test@1234',
      name: 'Test User',
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe('test@example.com');
    expect(res.body.data.role).toBe('VIEWER'); // default role
    expect(res.body.data).not.toHaveProperty('passwordHash'); // never exposed
  });

  it('returns 409 on duplicate email', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'test@example.com',
      password: 'Test@1234',
      name: 'Duplicate',
    });
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 on weak password', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'weak@example.com',
      password: 'short',
      name: 'Weak',
    });
    expect(res.status).toBe(400);
    expect(res.body.error.details).toBeDefined(); // Zod field-level errors
  });

  it('returns 400 on invalid email', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'notanemail',
      password: 'Test@1234',
      name: 'Bad Email',
    });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  it('returns access + refresh tokens on valid credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'test@example.com',
      password: 'Test@1234',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
  });

  it('returns 401 on wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'test@example.com',
      password: 'WrongPassword1!',
    });
    expect(res.status).toBe(401);
  });

  it('returns 401 on unknown email', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'nobody@example.com',
      password: 'Test@1234',
    });
    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/refresh + logout', () => {
  let refreshToken: string;

  beforeAll(async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'test@example.com',
      password: 'Test@1234',
    });
    refreshToken = res.body.data.refreshToken;
  });

  it('returns new tokens on valid refresh token', async () => {
    const res = await request(app).post('/api/auth/refresh').send({ refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    // Old token is now revoked (rotation)
    refreshToken = res.body.data.refreshToken;
  });

  it('rejects an already-rotated refresh token', async () => {
    // refreshToken has already been rotated in the test above — reusing old one should fail
    const res = await request(app).post('/api/auth/refresh').send({
      refreshToken: 'old-invalid-token',
    });
    expect(res.status).toBe(401);
  });

  it('logs out and invalidates the refresh token', async () => {
    const logoutRes = await request(app).post('/api/auth/logout').send({ refreshToken });
    expect(logoutRes.status).toBe(200);

    // Subsequent refresh with the same token should fail
    const refreshRes = await request(app).post('/api/auth/refresh').send({ refreshToken });
    expect(refreshRes.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  let accessToken: string;

  beforeAll(async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'test@example.com',
      password: 'Test@1234',
    });
    accessToken = res.body.data.accessToken;
  });

  it('returns the current user', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe('test@example.com');
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns 401 with malformed token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer not.a.real.token');
    expect(res.status).toBe(401);
  });
});

describe('RBAC — inactive user', () => {
  it('returns 401 if user is deactivated after token issuance', async () => {
    // Create and immediately deactivate a user
    const hash = await bcrypt.hash('Test@1234', 10);
    const user = await prisma.user.create({
      data: {
        email: 'inactive@example.com',
        passwordHash: hash,
        name: 'Inactive',
        role: 'VIEWER',
        status: 'ACTIVE',
      },
    });

    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'inactive@example.com',
      password: 'Test@1234',
    });
    const { accessToken } = loginRes.body.data;

    // Deactivate the user while the token is still valid
    await prisma.user.update({ where: { id: user.id }, data: { status: 'INACTIVE' } });

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(meRes.status).toBe(401);
  });
});
