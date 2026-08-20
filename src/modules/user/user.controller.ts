import type { Request, Response, NextFunction } from 'express';
import { UserService } from './user.service';
import { createUserSchema, updateUserSchema, userIdParamSchema } from './user.validator';

const userService = new UserService();

/**
 * GET /api/v1/users
 */
export async function listUsers(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const users = await userService.listUsers();
    res.json({ status: 'ok', data: users });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/users/:id
 */
export async function getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = userIdParamSchema.parse(req.params);
    const user = await userService.getUserById(id);
    res.json({ status: 'ok', data: user });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/users
 */
export async function createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = createUserSchema.parse(req.body);
    const user = await userService.createUser(input);
    res.status(201).json({ status: 'ok', data: user });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/v1/users/:id
 */
export async function updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = userIdParamSchema.parse(req.params);
    const input = updateUserSchema.parse(req.body);
    const user = await userService.updateUser(id, input);
    res.json({ status: 'ok', data: user });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/v1/users/:id
 */
export async function deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = userIdParamSchema.parse(req.params);
    await userService.deleteUser(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
