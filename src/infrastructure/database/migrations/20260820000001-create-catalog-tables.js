'use strict';

/**
 * Migration: Create catalog module tables in catalog_module schema.
 *
 * Creates 6 core tables:
 *   1. ecommerce              — Multi-tenant stores
 *   2. categories             — Hierarchical categories with LTREE paths
 *   3. products               — Products with pricing, status, and variant flags
 *   4. product_options        — Dynamic product options (Color, Size, RAM, etc.)
 *   5. product_option_values   — Option values (Black, White, 16GB, etc.)
 *   6. product_variants       — Product SKUs with independent price/quantity
 *   7. variant_option_values  — M2M join: variant ↔ option_values
 *
 * This migration is idempotent and runs inside a transaction (Umzug).
 */

const SCHEMA = 'catalog_module';

/** @type {import('sequelize').QueryInterface} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 0. Ensure schema & extension exist
    await queryInterface.createSchema(SCHEMA).catch(() => {});
    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS ltree;');

    // 1. ecommerce
    await queryInterface.createTable(
      { tableName: 'ecommerce', schema: SCHEMA },
      {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        name: {
          type: Sequelize.STRING(255),
          allowNull: false,
        },
        slug: {
          type: Sequelize.STRING(255),
          allowNull: false,
          unique: true,
        },
        status: {
          type: Sequelize.STRING(50),
          allowNull: false,
          defaultValue: 'ACTIVE',
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
      { tableName: 'ecommerce', schema: SCHEMA },
      ['slug'],
      { unique: true, name: 'idx_catalog_ecommerce_slug_unique' },
    );

    // 2. categories
    await queryInterface.createTable(
      { tableName: 'categories', schema: SCHEMA },
      {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        ecommerce_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: { tableName: 'ecommerce', schema: SCHEMA }, key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        parent_id: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: { tableName: 'categories', schema: SCHEMA }, key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        name: {
          type: Sequelize.STRING(255),
          allowNull: false,
        },
        slug: {
          type: Sequelize.STRING(255),
          allowNull: false,
        },
        path: {
          type: 'LTREE',
          allowNull: false,
        },
        is_active: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        sort_order: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
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
      { tableName: 'categories', schema: SCHEMA },
      ['ecommerce_id', 'slug'],
      { unique: true, name: 'idx_catalog_categories_ecommerce_slug_unique' },
    );
    await queryInterface.addIndex(
      { tableName: 'categories', schema: SCHEMA },
      ['ecommerce_id'],
      { name: 'idx_catalog_categories_ecommerce_id' },
    );
    await queryInterface.addIndex(
      { tableName: 'categories', schema: SCHEMA },
      ['parent_id'],
      { name: 'idx_catalog_categories_parent_id' },
    );

    // 3. products
    await queryInterface.createTable(
      { tableName: 'products', schema: SCHEMA },
      {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        ecommerce_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: { tableName: 'ecommerce', schema: SCHEMA }, key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        category_id: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: { tableName: 'categories', schema: SCHEMA }, key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        name: {
          type: Sequelize.STRING(255),
          allowNull: false,
        },
        slug: {
          type: Sequelize.STRING(255),
          allowNull: false,
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        price: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0.00,
        },
        quantity: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        status: {
          type: Sequelize.STRING(50),
          allowNull: false,
          defaultValue: 'DRAFT',
        },
        has_variants: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
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
      { tableName: 'products', schema: SCHEMA },
      ['ecommerce_id', 'slug'],
      { unique: true, name: 'idx_catalog_products_ecommerce_slug_unique' },
    );
    await queryInterface.addIndex(
      { tableName: 'products', schema: SCHEMA },
      ['ecommerce_id'],
      { name: 'idx_catalog_products_ecommerce_id' },
    );
    await queryInterface.addIndex(
      { tableName: 'products', schema: SCHEMA },
      ['category_id'],
      { name: 'idx_catalog_products_category_id' },
    );
    await queryInterface.addIndex(
      { tableName: 'products', schema: SCHEMA },
      ['status'],
      { name: 'idx_catalog_products_status' },
    );

    // 4. product_options
    await queryInterface.createTable(
      { tableName: 'product_options', schema: SCHEMA },
      {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        product_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: { tableName: 'products', schema: SCHEMA }, key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        name: {
          type: Sequelize.STRING(100),
          allowNull: false,
        },
        display_order: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
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
      { tableName: 'product_options', schema: SCHEMA },
      ['product_id', 'name'],
      { unique: true, name: 'idx_catalog_product_options_product_name_unique' },
    );

    // 5. product_option_values
    await queryInterface.createTable(
      { tableName: 'product_option_values', schema: SCHEMA },
      {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        product_option_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: { tableName: 'product_options', schema: SCHEMA }, key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        value: {
          type: Sequelize.STRING(100),
          allowNull: false,
        },
        display_order: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
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
      { tableName: 'product_option_values', schema: SCHEMA },
      ['product_option_id', 'value'],
      { unique: true, name: 'idx_catalog_option_values_option_value_unique' },
    );

    // 6. product_variants
    await queryInterface.createTable(
      { tableName: 'product_variants', schema: SCHEMA },
      {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        product_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: { tableName: 'products', schema: SCHEMA }, key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        sku: {
          type: Sequelize.STRING(100),
          allowNull: false,
        },
        price: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0.00,
        },
        quantity: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        status: {
          type: Sequelize.STRING(50),
          allowNull: false,
          defaultValue: 'ACTIVE',
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
      { tableName: 'product_variants', schema: SCHEMA },
      ['product_id', 'sku'],
      { unique: true, name: 'idx_catalog_product_variants_product_sku_unique' },
    );

    // 7. variant_option_values (M2M join)
    await queryInterface.createTable(
      { tableName: 'variant_option_values', schema: SCHEMA },
      {
        variant_id: {
          type: Sequelize.UUID,
          primaryKey: true,
          allowNull: false,
          references: { model: { tableName: 'product_variants', schema: SCHEMA }, key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        option_value_id: {
          type: Sequelize.UUID,
          primaryKey: true,
          allowNull: false,
          references: { model: { tableName: 'product_option_values', schema: SCHEMA }, key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
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
  },

  async down(queryInterface) {
    await queryInterface.dropTable({ tableName: 'variant_option_values', schema: SCHEMA });
    await queryInterface.dropTable({ tableName: 'product_variants', schema: SCHEMA });
    await queryInterface.dropTable({ tableName: 'product_option_values', schema: SCHEMA });
    await queryInterface.dropTable({ tableName: 'product_options', schema: SCHEMA });
    await queryInterface.dropTable({ tableName: 'products', schema: SCHEMA });
    await queryInterface.dropTable({ tableName: 'categories', schema: SCHEMA });
    await queryInterface.dropTable({ tableName: 'ecommerce', schema: SCHEMA });
  },
};
