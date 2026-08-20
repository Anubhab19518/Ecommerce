import { Router, type IRouter } from 'express';
import { authenticate } from '@shared/middleware/authentication';
import { login, refresh, logout, getMe } from './auth.controller';

const router: IRouter = Router();

router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', authenticate, getMe);

export { router as authRoutes };
