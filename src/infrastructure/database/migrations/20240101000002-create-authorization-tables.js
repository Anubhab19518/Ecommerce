'use strict';

/**
 * Migration: Create authorization module tables in authorization_module schema.
 *
 * Creates 5 tables:
 *   1. roles              — Role definitions with hierarchical inheritance
 *   2. permissions         — Permission rules (action + subject + conditions)
 *   3. role_permissions    — M2M join: role ↔ permission
 *   4. user_roles          — M2M join: user ↔ role (with scope and expiry)
 *   5. permission_conditions — Named reusable condition templates
 *
 * This migration is idempotent — safe to re-run.
 * Runs inside a transaction (configured by Umzug).
 */

const SCHEMA = 'authorization_module';

/** @type {import('sequelize').QueryInterface} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Ensure schema exists (idempotent)
    await queryInterface.createSchema(SCHEMA).catch(() => {
      // Schema already exists — ignore
    });

    // ─────────────────────────── 1. roles ───────────────────────────

    await queryInterface.createTable(
      { tableName: 'roles', schema: SCHEMA },
      {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        name: {
          type: Sequelize.STRING(100),
          allowNull: false,
          unique: true,
        },
        description: {
          type: Sequelize.STRING(500),
          allowNull: false,
          defaultValue: '',
        },
        parent_role_id: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: { tableName: 'roles', schema: SCHEMA }, key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        is_active: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        metadata: {
          type: Sequelize.JSONB,
          allowNull: true,
          defaultValue: null,
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW,
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW,
        },
      },
    );

    await queryInterface.addIndex({ tableName: 'roles', schema: SCHEMA }, ['name'], {
      unique: true,
      name: 'idx_authz_roles_name_unique',
    });

    await queryInterface.addIndex({ tableName: 'roles', schema: SCHEMA }, ['parent_role_id'], {
      name: 'idx_authz_roles_parent_role_id',
    });

    await queryInterface.addIndex({ tableName: 'roles', schema: SCHEMA }, ['is_active'], {
      name: 'idx_authz_roles_is_active',
    });

    // ─────────────────────────── 2. permissions ───────────────────────────

    await queryInterface.createTable(
      { tableName: 'permissions', schema: SCHEMA },
      {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        action: {
          type: Sequelize.STRING(50),
          allowNull: false,
        },
        subject: {
          type: Sequelize.STRING(100),
          allowNull: false,
        },
        fields: {
          type: Sequelize.JSONB,
          allowNull: true,
          defaultValue: null,
        },
        conditions_json: {
          type: Sequelize.JSONB,
          allowNull: true,
          defaultValue: null,
        },
        inverted: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        reason: {
          type: Sequelize.STRING(500),
          allowNull: true,
          defaultValue: null,
        },
        is_active: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW,
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW,
        },
      },
    );

    await queryInterface.addIndex(
      { tableName: 'permissions', schema: SCHEMA },
      ['action', 'subject'],
      { name: 'idx_authz_permissions_action_subject' },
    );

    await queryInterface.addIndex({ tableName: 'permissions', schema: SCHEMA }, ['is_active'], {
      name: 'idx_authz_permissions_is_active',
    });

    // ─────────────────────────── 3. role_permissions ───────────────────────────

    await queryInterface.createTable(
      { tableName: 'role_permissions', schema: SCHEMA },
      {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        role_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: { tableName: 'roles', schema: SCHEMA }, key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        permission_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: { tableName: 'permissions', schema: SCHEMA }, key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW,
        },
      },
    );

    await queryInterface.addIndex(
      { tableName: 'role_permissions', schema: SCHEMA },
      ['role_id', 'permission_id'],
      { unique: true, name: 'idx_authz_role_permissions_unique' },
    );

    await queryInterface.addIndex(
      { tableName: 'role_permissions', schema: SCHEMA },
      ['permission_id'],
      { name: 'idx_authz_role_permissions_permission_id' },
    );

    // ─────────────────────────── 4. user_roles ───────────────────────────

    await queryInterface.createTable(
      { tableName: 'user_roles', schema: SCHEMA },
      {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        user_id: {
          type: Sequelize.UUID,
          allowNull: false,
        },
        role_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: { tableName: 'roles', schema: SCHEMA }, key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        scope: {
          type: Sequelize.STRING(255),
          allowNull: true,
          defaultValue: null,
        },
        assigned_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW,
        },
        expires_at: {
          type: Sequelize.DATE,
          allowNull: true,
          defaultValue: null,
        },
      },
    );

    await queryInterface.addIndex(
      { tableName: 'user_roles', schema: SCHEMA },
      ['user_id', 'role_id'],
      { unique: true, name: 'idx_authz_user_roles_unique' },
    );

    await queryInterface.addIndex({ tableName: 'user_roles', schema: SCHEMA }, ['user_id'], {
      name: 'idx_authz_user_roles_user_id',
    });

    await queryInterface.addIndex({ tableName: 'user_roles', schema: SCHEMA }, ['role_id'], {
      name: 'idx_authz_user_roles_role_id',
    });

    await queryInterface.addIndex({ tableName: 'user_roles', schema: SCHEMA }, ['expires_at'], {
      name: 'idx_authz_user_roles_expires_at',
    });

    // ─────────────────────────── 5. permission_conditions ───────────────────────────

    await queryInterface.createTable(
      { tableName: 'permission_conditions', schema: SCHEMA },
      {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        name: {
          type: Sequelize.STRING(100),
          allowNull: false,
          unique: true,
        },
        description: {
          type: Sequelize.STRING(500),
          allowNull: false,
          defaultValue: '',
        },
        template: {
          type: Sequelize.JSONB,
          allowNull: false,
        },
        is_active: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW,
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW,
        },
      },
    );

    await queryInterface.addIndex(
      { tableName: 'permission_conditions', schema: SCHEMA },
      ['name'],
      { unique: true, name: 'idx_authz_permission_conditions_name_unique' },
    );
  },

  async down(queryInterface) {
    // Drop in reverse dependency order
    await queryInterface.dropTable({ tableName: 'permission_conditions', schema: SCHEMA });
    await queryInterface.dropTable({ tableName: 'user_roles', schema: SCHEMA });
    await queryInterface.dropTable({ tableName: 'role_permissions', schema: SCHEMA });
    await queryInterface.dropTable({ tableName: 'permissions', schema: SCHEMA });
    await queryInterface.dropTable({ tableName: 'roles', schema: SCHEMA });
  },
};
