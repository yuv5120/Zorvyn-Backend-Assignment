import { Router } from 'express';
import * as RecordsController from './records.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';

const router = Router();

// All record routes require authentication
router.use(authenticate);

/**
 * @openapi
 * /api/records:
 *   get:
 *     tags: [Records]
 *     summary: List financial records with filters, search, and pagination
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [INCOME, EXPENSE] }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: dateFrom
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: dateTo
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: search
 *         description: Full-text search in category and notes
 *         schema: { type: string }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [date, amount, createdAt, category], default: date }
 *       - in: query
 *         name: sortOrder
 *         schema: { type: string, enum: [asc, desc], default: desc }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200: { description: Paginated records list }
 */
router.get('/', RecordsController.listRecords);

/**
 * @openapi
 * /api/records/export:
 *   get:
 *     tags: [Records]
 *     summary: Export filtered records as CSV (Analyst, Admin)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: CSV file downloaded }
 */
router.get('/export', requireRole('ANALYST'), RecordsController.exportRecords);

/**
 * @openapi
 * /api/records/{id}:
 *   get:
 *     tags: [Records]
 *     summary: Get a single financial record
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Record object }
 *       404: { description: Not found }
 */
router.get('/:id', RecordsController.getRecord);

/**
 * @openapi
 * /api/records:
 *   post:
 *     tags: [Records]
 *     summary: Create a new financial record (Analyst, Admin)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount, type, category, date]
 *             properties:
 *               amount: { type: number, minimum: 0 }
 *               type: { type: string, enum: [INCOME, EXPENSE] }
 *               category: { type: string }
 *               date: { type: string, format: date }
 *               notes: { type: string }
 *     responses:
 *       201: { description: Record created }
 *       403: { description: Viewer cannot create records }
 */
router.post('/', requireRole('ANALYST'), RecordsController.createRecord);

/**
 * @openapi
 * /api/records/{id}:
 *   patch:
 *     tags: [Records]
 *     summary: Update a financial record (Analyst, Admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount: { type: number }
 *               type: { type: string, enum: [INCOME, EXPENSE] }
 *               category: { type: string }
 *               date: { type: string, format: date }
 *               notes: { type: string }
 *     responses:
 *       200: { description: Record updated }
 *       403: { description: Forbidden }
 */
router.patch('/:id', requireRole('ANALYST'), RecordsController.updateRecord);

/**
 * @openapi
 * /api/records/{id}:
 *   delete:
 *     tags: [Records]
 *     summary: Soft-delete a financial record (Admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Record soft-deleted }
 *       403: { description: Forbidden — Admin role required }
 */
router.delete('/:id', requireRole('ADMIN'), RecordsController.deleteRecord);

export default router;
