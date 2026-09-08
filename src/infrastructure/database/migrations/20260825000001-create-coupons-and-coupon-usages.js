'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // 1. Create catalog_module.coupons
      await queryInterface.sequelize.query(
        `CREATE TABLE IF NOT EXISTS catalog_module.coupons (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          ecommerce_id UUID NOT NULL REFERENCES catalog_module.ecommerce(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          code VARCHAR(50) NOT NULL,
          description TEXT,
          discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('PERCENTAGE', 'FIXED')),
          discount_value DECIMAL(12, 2) NOT NULL CHECK (discount_value > 0),
          target_type VARCHAR(30) NOT NULL CHECK (target_type IN ('ALL_PRODUCTS', 'PRODUCT', 'CATEGORY', 'USER_BEHAVIOR')),
          rules JSONB NOT NULL DEFAULT '{}'::jsonb,
          start_date TIMESTAMPTZ,
          expiry_date TIMESTAMPTZ,
          is_active BOOLEAN NOT NULL DEFAULT true,
          usage_limit INTEGER CHECK (usage_limit IS NULL OR usage_limit > 0),
          usage_limit_per_user INTEGER CHECK (usage_limit_per_user IS NULL OR usage_limit_per_user > 0),
          usage_count INTEGER NOT NULL DEFAULT 0 CHECK (usage_count >= 0),
          created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        );`,
        { transaction }
      );

      // Unique index on (ecommerce_id, UPPER(code))
      await queryInterface.sequelize.query(
        `CREATE UNIQUE INDEX IF NOT EXISTS idx_coupons_ecommerce_code ON catalog_module.coupons (ecommerce_id, UPPER(code));`,
        { transaction }
      );

      await queryInterface.sequelize.query(
        `CREATE INDEX IF NOT EXISTS idx_coupons_ecommerce_active ON catalog_module.coupons (ecommerce_id, is_active);`,
        { transaction }
      );

      // 2. Create catalog_module.coupon_usages
      await queryInterface.sequelize.query(
        `CREATE TABLE IF NOT EXISTS catalog_module.coupon_usages (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          ecommerce_id UUID NOT NULL REFERENCES catalog_module.ecommerce(id) ON DELETE CASCADE,
          coupon_id UUID NOT NULL REFERENCES catalog_module.coupons(id) ON DELETE CASCADE,
          order_id VARCHAR(255) NOT NULL,
          customer_email VARCHAR(255) NOT NULL,
          discount_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
          created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        );`,
        { transaction }
      );

      await queryInterface.sequelize.query(
        `CREATE INDEX IF NOT EXISTS idx_coupon_usages_coupon_customer ON catalog_module.coupon_usages (coupon_id, LOWER(customer_email));`,
        { transaction }
      );

      await queryInterface.sequelize.query(
        `CREATE INDEX IF NOT EXISTS idx_coupon_usages_ecommerce_order ON catalog_module.coupon_usages (ecommerce_id, order_id);`,
        { transaction }
      );

      // 3. Create catalog_module.orders if not exists
      await queryInterface.sequelize.query(
        `CREATE TABLE IF NOT EXISTS catalog_module.orders (
          id VARCHAR(255) PRIMARY KEY,
          ecommerce_id UUID NOT NULL REFERENCES catalog_module.ecommerce(id) ON DELETE CASCADE,
          customer_name VARCHAR(255) NOT NULL,
          customer_email VARCHAR(255) NOT NULL,
          customer_phone VARCHAR(50),
          items_count INTEGER NOT NULL DEFAULT 1,
          total DECIMAL(12, 2) NOT NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'PROCESSING',
          shipping_address JSONB NOT NULL DEFAULT '{}'::jsonb,
          items JSONB NOT NULL DEFAULT '[]'::jsonb,
          coupon_id UUID REFERENCES catalog_module.coupons(id) ON DELETE SET NULL,
          coupon_code VARCHAR(50),
          coupon_discount DECIMAL(12, 2) DEFAULT 0.00,
          created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        );`,
        { transaction }
      );

      await queryInterface.sequelize.query(
        `CREATE INDEX IF NOT EXISTS idx_orders_ecommerce_created ON catalog_module.orders (ecommerce_id, created_at DESC);`,
        { transaction }
      );

      // 4. Add coupon audit columns to catalog_module.orders if not exists (for backwards compatibility)
      await queryInterface.sequelize.query(
        `ALTER TABLE catalog_module.orders
          ADD COLUMN IF NOT EXISTS coupon_id UUID REFERENCES catalog_module.coupons(id) ON DELETE SET NULL,
          ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(50),
          ADD COLUMN IF NOT EXISTS coupon_discount DECIMAL(12, 2) DEFAULT 0.00;`,
        { transaction }
      );

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.sequelize.query(`DROP TABLE IF EXISTS catalog_module.coupon_usages CASCADE;`, { transaction });
      await queryInterface.sequelize.query(`DROP TABLE IF EXISTS catalog_module.orders CASCADE;`, { transaction });
      await queryInterface.sequelize.query(`DROP TABLE IF EXISTS catalog_module.coupons CASCADE;`, { transaction });
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },
};
