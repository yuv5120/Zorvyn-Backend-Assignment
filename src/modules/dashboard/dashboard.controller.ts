import { Request, Response, NextFunction } from 'express';
import * as DashboardService from './dashboard.service';
import { sendSuccess } from '../../utils/response';
import { z } from 'zod';

const trendsQuerySchema = z.object({
  months: z.coerce.number().min(1).max(24).default(6),
});

const recentActivityQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(50).default(10),
});

export async function getSummary(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await DashboardService.getSummary();
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

export async function getByCategory(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await DashboardService.getByCategory();
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

export async function getMonthlyTrends(req: Request, res: Response, next: NextFunction) {
  try {
    const { months } = trendsQuerySchema.parse(req.query);
    const data = await DashboardService.getMonthlyTrends(months);
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

export async function getRecentActivity(req: Request, res: Response, next: NextFunction) {
  try {
    const { limit } = recentActivityQuerySchema.parse(req.query);
    const data = await DashboardService.getRecentActivity(limit);
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}
