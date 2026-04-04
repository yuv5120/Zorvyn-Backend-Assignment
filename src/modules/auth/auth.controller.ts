import { Request, Response, NextFunction } from 'express';
import * as AuthService from './auth.service';
import { registerSchema, loginSchema, refreshSchema } from './auth.schema';
import { sendSuccess } from '../../utils/response';
import { UnauthorizedError } from '../../utils/errors';

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const input = registerSchema.parse(req.body);
    const user = await AuthService.register(input);
    sendSuccess(res, user, 201);
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const input = loginSchema.parse(req.body);
    const tokens = await AuthService.login(input);
    sendSuccess(res, tokens);
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const input = refreshSchema.parse(req.body);
    const tokens = await AuthService.refresh(input);
    sendSuccess(res, tokens);
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken || typeof refreshToken !== 'string') {
      throw new UnauthorizedError('Refresh token is required');
    }
    await AuthService.logout(refreshToken);
    sendSuccess(res, { message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    sendSuccess(res, req.user);
  } catch (err) {
    next(err);
  }
}
