import { Request } from 'express';

// Extend Express's Request to carry the authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string;
        role: string;
        status: string;
      };
    }
  }
}
