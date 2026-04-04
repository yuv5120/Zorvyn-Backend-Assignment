import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../utils/errors';

import { Role } from '../types/roles';

const ROLE_HIERARCHY: Record<Role, number> = {
  VIEWER: 0,
  ANALYST: 1,
  ADMIN: 2,
};

/**
 * Factory that returns a middleware enforcing minimum role level.
 *
 * Usage: router.delete('/:id', authenticate, requireRole('ADMIN'), handler)
 *
 * ADMIN can do everything ANALYST can, and ANALYST everything VIEWER can.
 */
export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const userRole = req.user?.role as Role | undefined;

    if (!userRole) {
      next(new ForbiddenError());
      return;
    }

    const userLevel = ROLE_HIERARCHY[userRole] ?? -1;
    const isAllowed = allowedRoles.some(
      (role) => userLevel >= ROLE_HIERARCHY[role],
    );

    if (!isAllowed) {
      next(
        new ForbiddenError(
          `This action requires one of: [${allowedRoles.join(', ')}]. Your role: ${userRole}`,
        ),
      );
      return;
    }

    next();
  };
}
