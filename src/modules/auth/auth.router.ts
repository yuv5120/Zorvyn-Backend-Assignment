import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as AuthController from './auth.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: { success: false, error: { message: 'Too many requests. Please try again later.' } },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { success: false, error: { message: 'Too many registration attempts. Please try again later.' } },
  standardHeaders: true,
  legacyHeaders: false,
});

const refreshLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { success: false, error: { message: 'Too many refresh attempts.' } },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user account
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, name]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 8 }
 *               name: { type: string }
 *     responses:
 *       201: { description: User created }
 *       400: { description: Validation error }
 *       409: { description: Email already in use }
 */
router.post('/register', registerLimiter, AuthController.register);

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Log in and receive access + refresh tokens
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200: { description: Tokens returned }
 *       401: { description: Invalid credentials }
 */
router.post('/login', authLimiter, AuthController.login);

/**
 * @openapi
 * /api/auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Rotate refresh token and get a new access token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200: { description: New tokens returned }
 *       401: { description: Invalid or expired refresh token }
 */
router.post('/refresh', refreshLimiter, AuthController.refresh);

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Invalidate refresh token and log out
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200: { description: Logged out }
 */
router.post('/logout', AuthController.logout);

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get the currently authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Current user }
 *       401: { description: Unauthorized }
 */
router.get('/me', authenticate, AuthController.me);

export default router;
