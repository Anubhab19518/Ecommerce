/**
 * ESLint custom rule: enforce-barrel-exports
 *
 * Ensures that when importing from another module, the import points to
 * the module's barrel export (index.ts) — NOT to an internal file.
 */

const { parseModuleImport, createRuleMeta, createImportRule } = require('../utils');

const schema = [
  {
    type: 'object',
    properties: {
      allowedInternalPatterns: {
        type: 'array',
        items: { type: 'string' },
        description: 'Glob patterns for files exempt from this rule',
      },
    },
    additionalProperties: false,
  },
];

const messages = {
  noDirectFileImport:
    'Cross-module import "{{importPath}}" bypasses the public API. ' +
    'Module "{{sourceModule}}" must import from "{{targetModule}}"\'s barrel export only. ' +
    "Change to: import { ... } from '../{{targetModule}}' or import { ... } from '@modules/{{targetModule}}'.",
};

module.exports = {
  meta: createRuleMeta(
    'Enforce that cross-module imports use barrel exports (index.ts) only',
    messages,
    schema,
  ),

  create: createImportRule((context, node, importPath, sourceModule) => {
    const info = parseModuleImport(importPath);
    if (!info) return;

    const { targetModule, subPath } = info;
    if (sourceModule === targetModule) return;
    if (/^index(\.\w+)?$/.test(subPath)) return;

    context.report({
      node,
      messageId: 'noDirectFileImport',
      data: { importPath, sourceModule, targetModule },
    });
  }),
};
