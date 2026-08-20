/**
 * ESLint plugin: eslint-plugin-modular-monolith
 *
 * Custom rules enforcing modular monolith architecture boundaries.
 *
 * Rules:
 *   - modular-monolith/no-cross-module-db-import
 *       Blocks direct imports of another module's model.ts or repository.ts.
 *   - modular-monolith/enforce-barrel-exports
 *       Ensures cross-module imports go through barrel exports (index.ts).
 *   - modular-monolith/no-cross-schema-query
 *       Blocks raw SQL queries that reference another module's database schema.
 */

module.exports = {
  rules: {
    'no-cross-module-db-import': require('./rules/no-cross-module-db-import'),
    'enforce-barrel-exports': require('./rules/enforce-barrel-exports'),
    'no-cross-schema-query': require('./rules/no-cross-schema-query'),
  },
};
