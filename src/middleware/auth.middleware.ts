import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { prisma } from '../config/prisma';
import { UnauthorizedError } from '../utils/errors';

interface AccessTokenPayload {
  sub: string;  // user ID
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

/**
 * Verifies the Bearer JWT in the Authorization header.
 * On success, attaches the full user object to req.user.
 * Throws 401 if the token is missing, malformed, or expired.
 */
export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or malformed Authorization header');
    }

    const token = authHeader.slice(7);

    let payload: AccessTokenPayload;
    try {
      payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
    } catch {
      throw new UnauthorizedError('Invalid or expired access token');
    }

    // Fetch fresh user from DB so status / role changes are respected immediately
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true, role: true, status: true },
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    if (user.status === 'INACTIVE') {
      throw new UnauthorizedError('Account is inactive');
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}
