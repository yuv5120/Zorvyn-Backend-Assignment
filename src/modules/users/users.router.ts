import { Router } from 'express';
import * as UsersController from './users.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';

const router = Router();

// All user management routes require authentication + ADMIN role
router.use(authenticate, requireRole('ADMIN'));

/**
 * @openapi
 * /api/users:
 *   get:
 *     tags: [Users]
 *     summary: List all users (Admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: role
 *         schema: { type: string, enum: [VIEWER, ANALYST, ADMIN] }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [ACTIVE, INACTIVE] }
 *     responses:
 *       200: { description: Paginated user list }
 *       403: { description: Forbidden }
 */
router.get('/', UsersController.listUsers);

/**
 * @openapi
 * /api/users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get a single user by ID (Admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: User object }
 *       404: { description: Not found }
 */
router.get('/:id', UsersController.getUser);

/**
 * @openapi
 * /api/users:
 *   post:
 *     tags: [Users]
 *     summary: Create a new user (Admin only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, name]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *               name: { type: string }
 *               role: { type: string, enum: [VIEWER, ANALYST, ADMIN], default: VIEWER }
 *     responses:
 *       201: { description: User created }
 */
router.post('/', UsersController.createUser);

/**
 * @openapi
 * /api/users/{id}:
 *   patch:
 *     tags: [Users]
 *     summary: Update user role or status (Admin only)
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
 *               name: { type: string }
 *               role: { type: string, enum: [VIEWER, ANALYST, ADMIN] }
 *               status: { type: string, enum: [ACTIVE, INACTIVE] }
 *     responses:
 *       200: { description: Updated user }
 */
router.patch('/:id', UsersController.updateUser);

/**
 * @openapi
 * /api/users/{id}:
 *   delete:
 *     tags: [Users]
 *     summary: Deactivate a user account (Admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: User deactivated }
 */
router.delete('/:id', UsersController.deactivateUser);

export default router;
