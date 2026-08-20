/**
 * Unit tests for the Condition Compiler.
 *
 * Tests the template interpolation engine that converts
 * database-stored JSON condition templates into runtime
 * condition objects for CASL evaluation.
 */

// Mock logger before importing the module under test
jest.mock('@infrastructure/logging/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import { compile, validateTemplate } from '../authorization.condition-compiler';

describe('ConditionCompiler', () => {
  describe('compile()', () => {
    it('should pass through static conditions unchanged', () => {
      const template = { status: 'active', role: 'admin' };
      const result = compile(template, {});

      expect(result).toEqual({ status: 'active', role: 'admin' });
    });

    it('should interpolate simple template variables', () => {
      const template = { createdBy: '${user.id}' };
      const context = { user: { id: 'abc-123' } };

      const result = compile(template, context);

      expect(result).toEqual({ createdBy: 'abc-123' });
    });

    it('should interpolate nested paths', () => {
      const template = { department: '${user.profile.department}' };
      const context = { user: { profile: { department: 'engineering' } } };

      const result = compile(template, context);

      expect(result).toEqual({ department: 'engineering' });
    });

    it('should preserve the raw type for single-expression values', () => {
      const template = { count: '${data.count}' };
      const context = { data: { count: 42 } };

      const result = compile(template, context);

      expect(result).toEqual({ count: 42 });
      expect(typeof result.count).toBe('number');
    });

    it('should handle boolean raw types', () => {
      const template = { isActive: '${user.verified}' };
      const context = { user: { verified: true } };

      const result = compile(template, context);

      expect(result).toEqual({ isActive: true });
      expect(typeof result.isActive).toBe('boolean');
    });

    it('should string-concatenate partial template expressions', () => {
      const template = { key: 'prefix-${user.id}-suffix' };
      const context = { user: { id: 'abc' } };

      const result = compile(template, context);

      expect(result).toEqual({ key: 'prefix-abc-suffix' });
    });

    it('should handle the ${now} built-in variable', () => {
      const before = new Date().toISOString();
      const template = { checkedAt: '${now}' };
      const result = compile(template, {});
      const after = new Date().toISOString();

      expect(typeof result.checkedAt).toBe('string');
      expect(result.checkedAt! >= before).toBe(true);
      expect(result.checkedAt! <= after).toBe(true);
    });

    it('should return undefined for unresolvable paths', () => {
      const template = { missing: '${user.nonexistent}' };
      const context = { user: { id: 'abc' } };

      const result = compile(template, context);

      expect(result).toEqual({ missing: undefined });
    });

    it('should return empty string for partial unresolvable interpolation', () => {
      const template = { label: 'hello-${missing.path}' };
      const result = compile(template, {});

      expect(result).toEqual({ label: 'hello-' });
    });

    it('should handle CASL-compatible operators', () => {
      const template = {
        status: { $in: ['draft', 'review'] },
        priority: { $gte: 3 },
        archived: { $ne: true },
      };

      const result = compile(template, {});

      expect(result).toEqual({
        status: { $in: ['draft', 'review'] },
        priority: { $gte: 3 },
        archived: { $ne: true },
      });
    });

    it('should compile template variables inside operator values', () => {
      const template = {
        createdBy: '${user.id}',
        status: { $in: ['draft', 'review'] },
      };
      const context = { user: { id: 'user-xyz' } };

      const result = compile(template, context);

      expect(result).toEqual({
        createdBy: 'user-xyz',
        status: { $in: ['draft', 'review'] },
      });
    });

    it('should compile arrays with template variables', () => {
      const template = {
        teamId: { $in: ['${user.teamId}', 'global'] },
      };
      const context = { user: { teamId: 'team-alpha' } };

      const result = compile(template, context);

      expect(result).toEqual({
        teamId: { $in: ['team-alpha', 'global'] },
      });
    });

    it('should handle deeply nested conditions', () => {
      const template = {
        $or: [{ createdBy: '${user.id}' }, { department: '${user.department}' }],
      };
      const context = { user: { id: 'u1', department: 'eng' } };

      const result = compile(template, context);

      expect(result).toEqual({
        $or: [{ createdBy: 'u1' }, { department: 'eng' }],
      });
    });

    it('should pass through null and undefined values', () => {
      const template = { nullable: null as unknown as string };

      const result = compile(template, {});

      expect(result).toEqual({ nullable: null });
    });

    it('should pass through numeric and boolean primitives', () => {
      const template = { count: 5, active: true };

      const result = compile(template as Record<string, unknown>, {});

      expect(result).toEqual({ count: 5, active: true });
    });

    it('should skip unknown operators and log a warning', () => {
      const template = { $unknown: 'bad', status: 'ok' };

      const result = compile(template, {});

      expect(result).toEqual({ status: 'ok' });
      // $unknown should be skipped
      expect(result).not.toHaveProperty('$unknown');
    });

    it('should block non-AUTHZ_ prefixed env variable access', () => {
      const template = { secret: '${env.DATABASE_PASSWORD}' };

      const result = compile(template, {});

      expect(result).toEqual({ secret: undefined });
    });

    it('should allow AUTHZ_ prefixed env variable access', () => {
      process.env.AUTHZ_TEST_VALUE = 'test-value';

      const template = { setting: '${env.AUTHZ_TEST_VALUE}' };
      const result = compile(template, {});

      expect(result).toEqual({ setting: 'test-value' });

      delete process.env.AUTHZ_TEST_VALUE;
    });
  });

  describe('validateTemplate()', () => {
    it('should return no errors for a valid template', () => {
      const template = {
        createdBy: '${user.id}',
        status: { $in: ['draft', 'review'] },
      };

      const errors = validateTemplate(template);

      expect(errors).toHaveLength(0);
    });

    it('should detect unknown operators', () => {
      const template = { $badOp: 'value' };

      const errors = validateTemplate(template);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('$badOp');
      expect(errors[0]).toContain('unknown operator');
    });

    it('should return no errors for deeply nested valid templates', () => {
      const template = {
        $or: [{ createdBy: '${user.id}' }, { status: { $in: ['draft'] } }],
      };

      const errors = validateTemplate(template);

      expect(errors).toHaveLength(0);
    });
  });
});
