import express, { json } from 'express';
import request from 'supertest';
import { errorHandler } from '@shared/errors/error-handler';
import { authRoutes } from '../auth.routes';
import { AuthService } from '../auth.service';

jest.mock('../auth.service');

jest.mock('@shared/middleware/authentication', () => ({
  authenticate: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    (req as express.Request & { user: { id: string; email: string } }).user = {
      id: 'mock-user-id',
      email: 'admin@bazar.com',
    };
    next();
  },
}));

describe('Auth Routes Integration', () => {
  const app = express();
  app.use(json());
  app.use('/api/v1/auth', authRoutes);
  app.use(errorHandler);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/auth/login', () => {
    it('returns 200 on valid credentials', async () => {
      (AuthService.prototype.login as jest.Mock).mockResolvedValueOnce({
        tokens: { accessToken: 'jwt.token.access', refreshToken: 's1.secret' },
        context: {
          user: { id: 'mock-user-id', email: 'admin@bazar.com', name: 'Admin' },
          organisation: { id: 'org-1', name: 'Bazar Store' },
          isSuperAdmin: false,
          roles: ['ecommerce_admin'],
          permissions: ['manage:Product'],
        },
      });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'admin@bazar.com', password: 'ValidPassword123!' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.data.accessToken).toBe('jwt.token.access');
      expect(res.body.data.user.email).toBe('admin@bazar.com');
    });

    it('returns 400 on invalid email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'invalid-email', password: '123' });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('error');
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('returns 200 on token refresh', async () => {
      (AuthService.prototype.refresh as jest.Mock).mockResolvedValueOnce({
        accessToken: 'new.jwt.access',
        refreshToken: 's1.newSecret',
      });

      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 's1.secret' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.data.accessToken).toBe('new.jwt.access');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('returns 200 on logout', async () => {
      (AuthService.prototype.logout as jest.Mock).mockResolvedValueOnce(undefined);

      const res = await request(app)
        .post('/api/v1/auth/logout')
        .send({ refreshToken: 's1.secret' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.data.message).toBe('Logged out successfully');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('returns authenticated user session context', async () => {
      (AuthService.prototype.getMe as jest.Mock).mockResolvedValueOnce({
        user: { id: 'mock-user-id', email: 'admin@bazar.com', name: 'Admin' },
        organisation: { id: 'org-1', name: 'Bazar Store' },
        isSuperAdmin: true,
        roles: ['super_admin'],
        permissions: ['*'],
      });

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer valid-jwt');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.data.user.id).toBe('mock-user-id');
      expect(res.body.data.isSuperAdmin).toBe(true);
    });
  });
});
