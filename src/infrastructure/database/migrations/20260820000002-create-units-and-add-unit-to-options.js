'use strict';

const { v4: uuidv4 } = require('uuid');

/**
 * Migration: Create catalog_module.units and add unit_id to product_options.
 *
 * 1. Creates catalog_module.units table for system-managed reference units.
 * 2. Seeds standard daily-use units (Volume, Weight, Count, Length, Packaging).
 * 3. Adds nullable unit_id foreign key to catalog_module.product_options with ON DELETE RESTRICT.
 *
 * Runs inside a transaction (Umzug).
 */

const SCHEMA = 'catalog_module';

/** @type {import('sequelize').QueryInterface} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Create units table
    await queryInterface.createTable(
      { tableName: 'units', schema: SCHEMA },
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
        symbol: {
          type: Sequelize.STRING(20),
          allowNull: false,
        },
        category: {
          type: Sequelize.STRING(50),
          allowNull: false,
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
      },
    );

    // Index on category for filtering
    await queryInterface.addIndex(
      { tableName: 'units', schema: SCHEMA },
      ['category'],
      { name: 'idx_units_category' },
    );

    // 2. Seed standard reference units
    const now = new Date();
    const standardUnits = [
      { id: uuidv4(), name: 'Liter', symbol: 'L', category: 'Volume', created_at: now, updated_at: now },
      { id: uuidv4(), name: 'Milliliter', symbol: 'ml', category: 'Volume', created_at: now, updated_at: now },
      { id: uuidv4(), name: 'Kilogram', symbol: 'kg', category: 'Weight', created_at: now, updated_at: now },
      { id: uuidv4(), name: 'Gram', symbol: 'g', category: 'Weight', created_at: now, updated_at: now },
      { id: uuidv4(), name: 'Piece', symbol: 'pcs', category: 'Count', created_at: now, updated_at: now },
      { id: uuidv4(), name: 'Meter', symbol: 'm', category: 'Length', created_at: now, updated_at: now },
      { id: uuidv4(), name: 'Centimeter', symbol: 'cm', category: 'Length', created_at: now, updated_at: now },
      { id: uuidv4(), name: 'Pack', symbol: 'pack', category: 'Packaging', created_at: now, updated_at: now },
      { id: uuidv4(), name: 'Bottle', symbol: 'bottle', category: 'Packaging', created_at: now, updated_at: now },
    ];

    await queryInterface.bulkInsert(
      { tableName: 'units', schema: SCHEMA },
      standardUnits,
    );

    // 3. Add unit_id to product_options with ON DELETE RESTRICT
    await queryInterface.addColumn(
      { tableName: 'product_options', schema: SCHEMA },
      'unit_id',
      {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: { tableName: 'units', schema: SCHEMA },
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
    );

    // Index on product_options.unit_id
    await queryInterface.addIndex(
      { tableName: 'product_options', schema: SCHEMA },
      ['unit_id'],
      { name: 'idx_product_options_unit_id' },
    );
  },

  async down(queryInterface) {
    // 1. Remove column and index from product_options
    await queryInterface.removeIndex(
      { tableName: 'product_options', schema: SCHEMA },
      'idx_product_options_unit_id',
    ).catch(() => {});

    await queryInterface.removeColumn(
      { tableName: 'product_options', schema: SCHEMA },
      'unit_id',
    );

    // 2. Drop units table
    await queryInterface.dropTable({ tableName: 'units', schema: SCHEMA });
  },
};
