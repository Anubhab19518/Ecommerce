'use strict';

const SCHEMA = 'catalog_module';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(
      { tableName: 'products', schema: SCHEMA },
      'tax_rate',
      {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
    );

    await queryInterface.addColumn(
      { tableName: 'products', schema: SCHEMA },
      'tax_class',
      {
        type: Sequelize.STRING(50),
        allowNull: true,
        defaultValue: 'GST 18%',
      },
    );
  },

  async down(queryInterface) {
    await queryInterface.removeColumn({ tableName: 'products', schema: SCHEMA }, 'tax_class');
    await queryInterface.removeColumn({ tableName: 'products', schema: SCHEMA }, 'tax_rate');
  },
};
