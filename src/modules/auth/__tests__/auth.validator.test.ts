import { loginSchema, refreshSchema, logoutSchema } from '../auth.validator';

describe('Auth Validator Schemas', () => {
  describe('loginSchema', () => {
    it('validates a valid login payload', () => {
      const valid = {
        email: 'user@example.com',
        password: 'SecurePassword123!',
      };
      const parsed = loginSchema.parse(valid);
      expect(parsed.email).toBe(valid.email);
      expect(parsed.password).toBe(valid.password);
    });

    it('rejects invalid email formats', () => {
      expect(() =>
        loginSchema.parse({
          email: 'not-an-email',
          password: 'Password123',
        }),
      ).toThrow();
    });

    it('rejects empty password', () => {
      expect(() =>
        loginSchema.parse({
          email: 'user@example.com',
          password: '',
        }),
      ).toThrow();
    });
  });

  describe('refreshSchema', () => {
    it('accepts valid refresh token in body', () => {
      const parsed = refreshSchema.parse({ refreshToken: 'session-id.token-secret' });
      expect(parsed.refreshToken).toBe('session-id.token-secret');
    });

    it('accepts empty object (when token is in cookie)', () => {
      const parsed = refreshSchema.parse({});
      expect(parsed.refreshToken).toBeUndefined();
    });
  });

  describe('logoutSchema', () => {
    it('accepts optional refresh token', () => {
      const parsed = logoutSchema.parse({ refreshToken: 'some-token' });
      expect(parsed.refreshToken).toBe('some-token');
    });
  });
});
