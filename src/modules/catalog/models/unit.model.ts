import { DataTypes, type Model, type Optional } from 'sequelize';
import { getSequelize } from '@infrastructure/database/connection';

const SCHEMA = 'catalog_module';

export interface UnitAttributes {
  id: string;
  name: string;
  symbol: string;
  category: string;
  createdAt: Date;
  updatedAt: Date;
}

export type UnitCreationAttributes = Optional<UnitAttributes, 'id' | 'createdAt' | 'updatedAt'>;

export type UnitModel = Model<UnitAttributes, UnitCreationAttributes> & UnitAttributes;

export const UnitModelDef = getSequelize().define<UnitModel>(
  'Unit',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    symbol: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    category: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'units',
    schema: SCHEMA,
    timestamps: true,
    underscored: true,
  },
);
