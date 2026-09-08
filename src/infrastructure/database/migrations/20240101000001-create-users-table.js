'use strict';

/**
 * Migration: Create users table in user_module schema.
 *
 * This migration is idempotent — safe to re-run.
 * Runs inside a transaction (configured by Umzug).
 */

/** @type {import('sequelize').QueryInterface} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Ensure schema exists (idempotent)
    await queryInterface.createSchema('user_module').catch(() => {
      // Schema already exists — ignore
    });

    await queryInterface.createTable(
      { tableName: 'users', schema: 'user_module' },
      {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        email: {
          type: Sequelize.STRING(255),
          allowNull: false,
          unique: true,
        },
        name: {
          type: Sequelize.STRING(255),
          allowNull: false,
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

    // Indexes for common query patterns
    await queryInterface.addIndex({ tableName: 'users', schema: 'user_module' }, ['email'], {
      unique: true,
      name: 'idx_users_email_unique',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable({ tableName: 'users', schema: 'user_module' });
  },
};
