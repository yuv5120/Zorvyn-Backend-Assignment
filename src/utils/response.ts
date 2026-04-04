import { Response } from 'express';

export interface ApiMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  [key: string]: unknown;
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode = 200,
  meta?: ApiMeta,
): void {
  res.status(statusCode).json({
    success: true,
    data,
    ...(meta ? { meta } : {}),
  });
}
