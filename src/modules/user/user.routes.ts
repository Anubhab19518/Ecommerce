import { Router } from 'express';
import { listUsers, getUserById, createUser, updateUser, deleteUser } from './user.controller';

export const userRoutes = Router();

userRoutes.get('/', listUsers);
userRoutes.get('/:id', getUserById);
userRoutes.post('/', createUser);
userRoutes.patch('/:id', updateUser);
userRoutes.delete('/:id', deleteUser);
