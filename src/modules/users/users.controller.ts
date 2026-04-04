import { Request, Response, NextFunction } from 'express';
import * as UsersService from './users.service';
import {
  createUserSchema,
  updateUserSchema,
  listUsersQuerySchema,
} from './users.schema';
import { sendSuccess } from '../../utils/response';

export async function listUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listUsersQuerySchema.parse(req.query);
    const result = await UsersService.listUsers(query as Record<string, unknown>);
    sendSuccess(res, result.users, 200, result.meta);
  } catch (err) {
    next(err);
  }
}

export async function getUser(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await UsersService.getUserById(req.params.id);
    sendSuccess(res, user);
  } catch (err) {
    next(err);
  }
}

export async function createUser(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createUserSchema.parse(req.body);
    const user = await UsersService.createUser(input);
    sendSuccess(res, user, 201);
  } catch (err) {
    next(err);
  }
}

export async function updateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateUserSchema.parse(req.body);
    const user = await UsersService.updateUser(req.params.id, input, req.user!.id);
    sendSuccess(res, user);
  } catch (err) {
    next(err);
  }
}

export async function deactivateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await UsersService.deactivateUser(req.params.id, req.user!.id);
    sendSuccess(res, user);
  } catch (err) {
    next(err);
  }
}
