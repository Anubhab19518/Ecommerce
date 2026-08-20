const { getSourceModule, extractImportPath, parseModuleImport } = require('../utils');

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
});
