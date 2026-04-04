import { Router } from 'express';
import * as DashboardController from './dashboard.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';

const router = Router();

// All dashboard routes require authentication
router.use(authenticate);

/**
 * @openapi
 * /api/dashboard/summary:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get total income, expenses, and net balance
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Financial summary
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 totalIncome: 338000
 *                 totalExpenses: 31790
 *                 netBalance: 306210
 *                 incomeCount: 9
 *                 expenseCount: 11
 *                 totalTransactions: 20
 */
router.get('/summary', DashboardController.getSummary);

/**
 * @openapi
 * /api/dashboard/by-category:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get income and expense totals grouped by category
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Category breakdown }
 */
router.get('/by-category', DashboardController.getByCategory);

/**
 * @openapi
 * /api/dashboard/trends:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get monthly income/expense trends (Analyst, Admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: months
 *         description: Number of past months to include (1-24, default 6)
 *         schema: { type: integer, default: 6 }
 *     responses:
 *       200: { description: Monthly trends array }
 *       403: { description: Viewer cannot access detailed insights }
 */
router.get('/trends', requireRole('ANALYST'), DashboardController.getMonthlyTrends);

/**
 * @openapi
 * /api/dashboard/recent:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get recent financial activity
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         description: Number of transactions to return (1-50, default 10)
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200: { description: Recent transactions }
 */
router.get('/recent', DashboardController.getRecentActivity);

export default router;
