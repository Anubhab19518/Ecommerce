'use strict';

/**
 * Migration: Move unit_id from catalog_module.product_options to catalog_module.product_option_values.
 *
 * 1. Adds nullable unit_id foreign key to catalog_module.product_option_values referencing catalog_module.units(id)
 *    with ON UPDATE CASCADE and ON DELETE SET NULL.
 * 2. Creates index idx_product_option_values_unit_id on catalog_module.product_option_values(unit_id).
 * 3. Data migration: copies existing product_options.unit_id to child product_option_values.unit_id.
 * 4. Removes index, foreign key constraint, and unit_id column from catalog_module.product_options.
 *
 * Down Migration Protection:
 * Checks if any option contains multiple distinct non-null unit_id values among its option values.
 * If heterogeneous units exist, aborts rollback with an explicit error to prevent data loss.
 */

const SCHEMA = 'catalog_module';

/** @type {import('sequelize').QueryInterface} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Add unit_id column to product_option_values
    await queryInterface.addColumn(
      { tableName: 'product_option_values', schema: SCHEMA },
      'unit_id',
      {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: { tableName: 'units', schema: SCHEMA },
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
    );

    // 2. Add index on product_option_values.unit_id
    await queryInterface.addIndex(
      { tableName: 'product_option_values', schema: SCHEMA },
      ['unit_id'],
      { name: 'idx_product_option_values_unit_id' },
    );

    // 3. Migrate existing data from product_options.unit_id to child product_option_values.unit_id
    await queryInterface.sequelize.query(`
      UPDATE catalog_module.product_option_values pov
      SET unit_id = po.unit_id
      FROM catalog_module.product_options po
      WHERE pov.product_option_id = po.id
        AND po.unit_id IS NOT NULL;
    `);

    // 4. Remove index on product_options.unit_id
    try {
      await queryInterface.removeIndex(
        { tableName: 'product_options', schema: SCHEMA },
        'idx_product_options_unit_id',
      );
    } catch {
      // Index may not exist if manually managed
    }

    // 5. Remove unit_id column from product_options (drops FK constraint automatically in Postgres)
    await queryInterface.removeColumn({ tableName: 'product_options', schema: SCHEMA }, 'unit_id');
  },

  async down(queryInterface, Sequelize) {
    // 1. Safety check: Check if any option has multiple distinct non-null unit_id values
    const [results] = await queryInterface.sequelize.query(`
      SELECT product_option_id
      FROM catalog_module.product_option_values
      WHERE unit_id IS NOT NULL
      GROUP BY product_option_id
      HAVING COUNT(DISTINCT unit_id) > 1;
    `);

    if (results && results.length > 0) {
      throw new Error(
        'Migration rollback aborted: One or more product options contain option values with different units. The legacy schema supports only one unit per option and cannot represent this data losslessly.',
      );
    }

    // 2. Re-add unit_id column to product_options
    await queryInterface.addColumn({ tableName: 'product_options', schema: SCHEMA }, 'unit_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: { tableName: 'units', schema: SCHEMA },
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    // 3. Re-create index on product_options.unit_id
    await queryInterface.addIndex({ tableName: 'product_options', schema: SCHEMA }, ['unit_id'], {
      name: 'idx_product_options_unit_id',
    });

    // 4. Populate product_options.unit_id from distinct child option values
    await queryInterface.sequelize.query(`
      UPDATE catalog_module.product_options po
      SET unit_id = (
        SELECT unit_id
        FROM catalog_module.product_option_values pov
        WHERE pov.product_option_id = po.id
          AND pov.unit_id IS NOT NULL
        LIMIT 1
      );
    `);

    // 5. Remove index on product_option_values.unit_id
    try {
      await queryInterface.removeIndex(
        { tableName: 'product_option_values', schema: SCHEMA },
        'idx_product_option_values_unit_id',
      );
    } catch {
      // Ignore if index missing
    }

    // 6. Drop unit_id column from product_option_values
    await queryInterface.removeColumn(
      { tableName: 'product_option_values', schema: SCHEMA },
      'unit_id',
    );
  },
};
