'use strict';

/**
 * Migration: Add password_hash column to users table in user_module schema.
 *
 * Runs inside a transaction (configured by Umzug).
 */

/** @type {import('sequelize').QueryInterface} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(
      { tableName: 'users', schema: 'user_module' },
      'password_hash',
      {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
    );
  },

  async down(queryInterface) {
    await queryInterface.removeColumn(
      { tableName: 'users', schema: 'user_module' },
      'password_hash',
    );
  },
};
