import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { ConflictError, UnauthorizedError } from '../../utils/errors';
import type { RegisterInput, LoginInput, RefreshInput } from './auth.schema';

const SALT_ROUNDS = 10;
const REFRESH_TOKEN_BYTES = 64;



function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateAccessToken(userId: string, email: string, role: string): string {
  return jwt.sign(
    { sub: userId, email, role },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRES_IN } as jwt.SignOptions,
  );
}

function generateRefreshToken(): string {
  return crypto.randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
}

function parseExpiresIn(duration: string): Date {
  const units: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) return new Date(Date.now() + 7 * 86_400_000); // default 7d
  return new Date(Date.now() + parseInt(match[1]) * (units[match[2]] ?? 86_400_000));
}



export async function register(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new ConflictError('An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: { email: input.email, passwordHash, name: input.name },
    select: { id: true, email: true, name: true, role: true, status: true, createdAt: true },
  });

  return user;
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  // Constant-time comparison to prevent user enumeration
  const dummyHash = '$2b$10$invalidhashfortimingprotection00000000000000000000';
  const isValid = user
    ? await bcrypt.compare(input.password, user.passwordHash)
    : await bcrypt.compare(input.password, dummyHash);

  if (!user || !isValid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  if (user.status === 'INACTIVE') {
    throw new UnauthorizedError('Account is inactive. Contact an administrator.');
  }

  const accessToken = generateAccessToken(user.id, user.email, user.role);
  const rawRefreshToken = generateRefreshToken();

  // Persist hashed refresh token
  await prisma.refreshToken.create({
    data: {
      tokenHash: hashToken(rawRefreshToken),
      userId: user.id,
      expiresAt: parseExpiresIn(env.JWT_REFRESH_EXPIRES_IN),
    },
  });

  return {
    accessToken,
    refreshToken: rawRefreshToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  };
}

export async function refresh(input: RefreshInput) {
  const tokenHash = hashToken(input.refreshToken);

  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: { select: { id: true, email: true, role: true, status: true } } },
  });

  if (!stored || stored.expiresAt < new Date()) {
    // Delete expired token if found
    if (stored) await prisma.refreshToken.delete({ where: { tokenHash } });
    throw new UnauthorizedError('Invalid or expired refresh token');
  }

  if (stored.user.status === 'INACTIVE') {
    throw new UnauthorizedError('Account is inactive');
  }

  // Token rotation: delete old, issue new
  await prisma.refreshToken.delete({ where: { tokenHash } });

  const newRawRefreshToken = generateRefreshToken();
  await prisma.refreshToken.create({
    data: {
      tokenHash: hashToken(newRawRefreshToken),
      userId: stored.user.id,
      expiresAt: parseExpiresIn(env.JWT_REFRESH_EXPIRES_IN),
    },
  });

  const newAccessToken = generateAccessToken(
    stored.user.id,
    stored.user.email,
    stored.user.role,
  );

  return { accessToken: newAccessToken, refreshToken: newRawRefreshToken };
}

export async function logout(rawRefreshToken: string) {
  const tokenHash = hashToken(rawRefreshToken);
  // Silently ignore if token not found (idempotent logout)
  await prisma.refreshToken.deleteMany({ where: { tokenHash } });
}
