'use strict';

const SCHEMA = 'catalog_module';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Create banners table in catalog_module schema
    await queryInterface.createTable(
      { tableName: 'banners', schema: SCHEMA },
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
        title: {
          type: Sequelize.STRING(255),
          allowNull: false,
        },
        subtitle: {
          type: Sequelize.STRING(255),
          allowNull: true,
        },
        image_url: {
          type: Sequelize.TEXT,
          allowNull: false,
        },
        public_id: {
          type: Sequelize.STRING(255),
          allowNull: true,
        },
        redirect_url: {
          type: Sequelize.STRING(500),
          allowNull: true,
        },
        display_order: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
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
      { tableName: 'banners', schema: SCHEMA },
      ['ecommerce_id', 'is_active', 'display_order'],
      { name: 'idx_catalog_banners_ecommerce_active_order' },
    );

    // 2. Add details JSONB column to products table
    await queryInterface.addColumn(
      { tableName: 'products', schema: SCHEMA },
      'details',
      {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: [],
      },
    );

    // 3. Add details JSONB column to product_variants table
    await queryInterface.addColumn(
      { tableName: 'product_variants', schema: SCHEMA },
      'details',
      {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: [],
      },
    );
  },

  async down(queryInterface) {
    await queryInterface.removeColumn({ tableName: 'product_variants', schema: SCHEMA }, 'details');
    await queryInterface.removeColumn({ tableName: 'products', schema: SCHEMA }, 'details');
    await queryInterface.dropTable({ tableName: 'banners', schema: SCHEMA });
  },
};
