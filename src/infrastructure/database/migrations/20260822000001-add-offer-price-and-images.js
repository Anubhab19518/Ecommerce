'use strict';

/**
 * Migration: Add offer_price and photo image tables to catalog_module.
 *
 * 1. Adds offer_price (nullable DECIMAL(12, 2)) to catalog_module.products.
 * 2. Adds offer_price (nullable DECIMAL(12, 2)) to catalog_module.product_variants.
 * 3. Creates catalog_module.product_images table (url, public_id, display_order).
 * 4. Creates catalog_module.product_variant_images table (url, public_id, display_order).
 *
 * Runs inside a transaction (Umzug).
 */

const SCHEMA = 'catalog_module';

/** @type {import('sequelize').QueryInterface} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Add offer_price to products
    await queryInterface.addColumn({ tableName: 'products', schema: SCHEMA }, 'offer_price', {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: null,
    });

    // 2. Add offer_price to product_variants
    await queryInterface.addColumn(
      { tableName: 'product_variants', schema: SCHEMA },
      'offer_price',
      {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: true,
        defaultValue: null,
      },
    );

    // 3. Create product_images table
    await queryInterface.createTable(
      { tableName: 'product_images', schema: SCHEMA },
      {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        productId: {
          type: Sequelize.UUID,
          allowNull: false,
          field: 'product_id',
          references: {
            model: { tableName: 'products', schema: SCHEMA },
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        url: {
          type: Sequelize.STRING(1000),
          allowNull: false,
        },
        publicId: {
          type: Sequelize.STRING(255),
          allowNull: true,
          field: 'public_id',
        },
        displayOrder: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
          field: 'display_order',
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW,
          field: 'created_at',
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW,
          field: 'updated_at',
        },
      },
    );

    await queryInterface.addIndex({ tableName: 'product_images', schema: SCHEMA }, ['product_id'], {
      name: 'idx_product_images_product_id',
    });

    // 4. Create product_variant_images table
    await queryInterface.createTable(
      { tableName: 'product_variant_images', schema: SCHEMA },
      {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        variantId: {
          type: Sequelize.UUID,
          allowNull: false,
          field: 'variant_id',
          references: {
            model: { tableName: 'product_variants', schema: SCHEMA },
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        url: {
          type: Sequelize.STRING(1000),
          allowNull: false,
        },
        publicId: {
          type: Sequelize.STRING(255),
          allowNull: true,
          field: 'public_id',
        },
        displayOrder: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
          field: 'display_order',
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW,
          field: 'created_at',
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW,
          field: 'updated_at',
        },
      },
    );

    await queryInterface.addIndex(
      { tableName: 'product_variant_images', schema: SCHEMA },
      ['variant_id'],
      {
        name: 'idx_product_variant_images_variant_id',
      },
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable({ tableName: 'product_variant_images', schema: SCHEMA });
    await queryInterface.dropTable({ tableName: 'product_images', schema: SCHEMA });
    await queryInterface.removeColumn(
      { tableName: 'product_variants', schema: SCHEMA },
      'offer_price',
    );
    await queryInterface.removeColumn({ tableName: 'products', schema: SCHEMA }, 'offer_price');
  },
};
