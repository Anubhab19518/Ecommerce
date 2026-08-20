/**
 * ESLint custom rule: no-cross-module-db-import
 *
 * Prevents importing model or repository files directly from another module.
 * Modules must communicate through public APIs (barrel exports) and services.
 */

const { createRuleMeta, createImportRule } = require('../utils');

const FORBIDDEN_EXPORTS = ['model', 'repository'];

const messages = {
  noCrossModuleDB:
    'Direct import of "{{importPath}}" violates modular monolith boundaries. ' +
    'Module "{{sourceModule}}" must not access "{{targetModule}}"\'s models or repositories directly. ' +
    'Use the target module\'s public API (import from "{{targetModule}}") or communicate via events.',
};

module.exports = {
  meta: createRuleMeta(
    'Prevent importing model or repository files from another module directly',
    messages,
  ),

  create: createImportRule((context, node, importPath, sourceModule) => {
    const match = /modules[\\/]([^\\/]+)[\\/].*?(model|repository)/.exec(importPath);
    if (!match) return;

    const targetModule = match[1];
    const fileType = match[2];

    if (sourceModule === targetModule) return;

    if (FORBIDDEN_EXPORTS.includes(fileType)) {
      context.report({
        node,
        messageId: 'noCrossModuleDB',
        data: { importPath, sourceModule, targetModule },
      });
    }
  }),
};
