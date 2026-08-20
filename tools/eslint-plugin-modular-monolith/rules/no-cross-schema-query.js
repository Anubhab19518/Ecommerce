/**
 * ESLint custom rule: no-cross-schema-query
 *
 * Prevents raw SQL queries that reference schemas belonging to other modules.
 */

const { getSourceModule } = require('../utils');

const MODULE_SCHEMA_MAP = {
  user: 'user_module',
  notification: 'notification_module',
  authorization: 'authorization_module',
  catalog: 'catalog_module',
  health: null,
  auth: null,
};

const SCHEMA_TO_MODULE = {
  user_module: 'user',
  notification_module: 'notification',
  authorization_module: 'authorization',
  catalog_module: 'catalog',
};

const ALL_SCHEMAS = [
  'user_module',
  'notification_module',
  'authorization_module',
  'catalog_module',
];

function matchesSchema(value, schema) {
  const regex = new RegExp(`(\\b"${schema}"|'${schema}'|\\b${schema})\\s*\\.`, 'i');
  return regex.test(value);
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: "Prevent raw SQL queries that reference another module's database schema",
      category: 'Architecture',
      recommended: true,
    },
    schema: [],
    messages: {
      noCrossSchemaQuery:
        'Raw SQL references schema "{{schema}}" which belongs to module "{{ownerModule}}". ' +
        'Module "{{sourceModule}}" must not query another module\'s schema directly. ' +
        "Use the target module's public service API or publish an event via the notification module.",
    },
  },

  create(context) {
    const sourceModule = getSourceModule(context);
    if (!sourceModule) return {};

    const ownSchema = MODULE_SCHEMA_MAP[sourceModule] || null;

    function checkStringForSchemaRef(node, value) {
      if (typeof value !== 'string') return;

      const targetSchema = ALL_SCHEMAS.find(
        (schema) => schema !== ownSchema && matchesSchema(value, schema),
      );

      if (targetSchema) {
        context.report({
          node,
          messageId: 'noCrossSchemaQuery',
          data: {
            schema: targetSchema,
            ownerModule: SCHEMA_TO_MODULE[targetSchema] || 'unknown',
            sourceModule,
          },
        });
      }
    }

    return {
      Literal(node) {
        if (typeof node.value === 'string' && node.value.length > 10) {
          checkStringForSchemaRef(node, node.value);
        }
      },
      TemplateLiteral(node) {
        for (const quasi of node.quasis) {
          if (quasi.value?.raw) {
            checkStringForSchemaRef(node, quasi.value.raw);
          }
        }
      },
    };
  },
};
