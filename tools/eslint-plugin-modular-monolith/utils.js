/**
 * Shared utility functions for custom modular monolith ESLint rules.
 */

function getSourceModule(context) {
  const file = context.filename || (context.getFilename ? context.getFilename() : '');
  const match = /src[\\/]modules[\\/]([^\\/]+)[\\/]/.exec(file);
  return match ? match[1] : null;
}

function getImportDeclPath(node) {
  if (node.type !== 'ImportDeclaration') return null;
  const val = node.source?.value;
  return typeof val === 'string' ? val : null;
}

function isRequireCall(node) {
  return Boolean(
    node && node.type === 'CallExpression' && node.callee && node.callee.name === 'require',
  );
}

function getRequireCallPath(node) {
  if (!isRequireCall(node)) return null;
  const arg = node.arguments[0];
  return Boolean(arg && arg.type === 'Literal' && typeof arg.value === 'string') ? arg.value : null;
}

function extractImportPath(node) {
  return getImportDeclPath(node) || getRequireCallPath(node);
}

function parseModuleImport(importPath) {
  const match = /modules[\\/]([^\\/]+)[\\/](.+)/.exec(importPath);
  if (!match) return null;
  return {
    targetModule: match[1],
    subPath: match[2],
  };
}

function createRuleMeta(description, messages, schema = []) {
  return {
    type: 'problem',
    docs: {
      description,
      category: 'Architecture',
      recommended: true,
    },
    schema,
    messages,
  };
}

function createImportRule(checkImport) {
  return function create(context) {
    const sourceModule = getSourceModule(context);
    if (!sourceModule) return {};

    function checkNode(node) {
      const importPath = extractImportPath(node);
      if (!importPath) return;
      checkImport(context, node, importPath, sourceModule);
    }

    return {
      ImportDeclaration: checkNode,
      CallExpression: checkNode,
    };
  };
}

module.exports = {
  getSourceModule,
  extractImportPath,
  parseModuleImport,
  createRuleMeta,
  createImportRule,
};
