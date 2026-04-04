import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';
import { env } from '../config/env';

/**
 * Global error handling middleware.
 * Must be registered last in the Express middleware chain.
 *
 * Handles:
 * - AppError (custom operational errors) → structured JSON
 * - ZodError (validation failures)       → 400 with field-level details
 * - Unknown errors                       → 500 (internals hidden in production)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Zod validation error
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        details: err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      },
    });
    return;
  }

  // Known operational error
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: { message: err.message },
    });
    return;
  }

  // Unknown error — log it but don't leak internals to client
  console.error('[Unhandled Error]', err);
  res.status(500).json({
    success: false,
    error: {
      message: 'An unexpected error occurred',
      ...(env.isDevelopment && err instanceof Error
        ? { detail: err.message, stack: err.stack }
        : {}),
    },
  });
}
