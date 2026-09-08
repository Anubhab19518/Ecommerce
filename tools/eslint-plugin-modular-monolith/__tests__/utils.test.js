const {
  getSourceModule,
  extractImportPath,
  parseModuleImport,
  createRuleMeta,
  createImportRule,
} = require('../utils');

describe('ESLint Plugin Utils', () => {
  describe('getSourceModule', () => {
    it('should extract module name from file path', () => {
      const context = { filename: 'src/modules/user/user.controller.ts' };
      expect(getSourceModule(context)).toBe('user');
    });

    it('should return null when not in a module', () => {
      const context = { filename: 'src/index.ts' };
      expect(getSourceModule(context)).toBeNull();
    });

    it('should fallback to getFilename()', () => {
      const context = { getFilename: () => 'src/modules/health/health.service.ts' };
      expect(getSourceModule(context)).toBe('health');
    });
  });

  describe('extractImportPath', () => {
    it('should extract path from ImportDeclaration', () => {
      const node = {
        type: 'ImportDeclaration',
        source: { value: '@modules/user' },
      };
      expect(extractImportPath(node)).toBe('@modules/user');
    });

    it('should extract path from require call', () => {
      const node = {
        type: 'CallExpression',
        callee: { name: 'require' },
        arguments: [{ type: 'Literal', value: '../health/health.service' }],
      };
      expect(extractImportPath(node)).toBe('../health/health.service');
    });

    it('should return null for invalid nodes', () => {
      expect(extractImportPath({ type: 'VariableDeclaration' })).toBeNull();
    });
  });

  describe('parseModuleImport', () => {
    it('should parse module and subPath', () => {
      expect(parseModuleImport('modules/user/user.service')).toEqual({
        targetModule: 'user',
        subPath: 'user.service',
      });
    });

    it('should return null if pattern does not match', () => {
      expect(parseModuleImport('../shared/logger')).toBeNull();
    });
  });

  describe('createRuleMeta', () => {
    it('should return standard ESLint rule meta object', () => {
      const meta = createRuleMeta('Rule description', { msgKey: 'Error message' });
      expect(meta.type).toBe('problem');
      expect(meta.docs.description).toBe('Rule description');
      expect(meta.docs.category).toBe('Architecture');
      expect(meta.docs.recommended).toBe(true);
      expect(meta.messages.msgKey).toBe('Error message');
      expect(meta.schema).toEqual([]);
    });
  });

  describe('createImportRule', () => {
    it('should create an ESLint rule that checks ImportDeclaration and CallExpression', () => {
      const checkImport = jest.fn();
      const rule = createImportRule(checkImport);
      const context = { filename: 'src/modules/user/user.controller.ts' };
      const visitors = rule(context);

      expect(typeof visitors.ImportDeclaration).toBe('function');
      expect(typeof visitors.CallExpression).toBe('function');

      const importNode = {
        type: 'ImportDeclaration',
        source: { value: '@modules/health' },
      };
      visitors.ImportDeclaration(importNode);
      expect(checkImport).toHaveBeenCalledWith(context, importNode, '@modules/health', 'user');

      const requireNode = {
        type: 'CallExpression',
        callee: { name: 'require' },
        arguments: [{ type: 'Literal', value: '@modules/order' }],
      };
      visitors.CallExpression(requireNode);
      expect(checkImport).toHaveBeenCalledWith(context, requireNode, '@modules/order', 'user');
    });

    it('should return empty visitors when not in a module', () => {
      const checkImport = jest.fn();
      const rule = createImportRule(checkImport);
      const context = { filename: 'src/index.ts' };
      const visitors = rule(context);
      expect(visitors).toEqual({});
    });
  });
});
