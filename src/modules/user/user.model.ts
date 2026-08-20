import { DataTypes, type Model, type Optional } from 'sequelize';
import { getSequelize } from '@infrastructure/database/connection';

// ---------- Attributes ----------
export interface UserAttributes {
  id: string;
  email: string;
  name: string;
  passwordHash?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Input types for creation (id is optional)
export type UserCreationAttributes = Optional<
  UserAttributes,
  'id' | 'passwordHash' | 'createdAt' | 'updatedAt'
>;

// ---------- Model ----------
export type UserModel = Model<UserAttributes, UserCreationAttributes> & UserAttributes;

export const UserModelDef = getSequelize().define<UserModel>(
  'User',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    passwordHash: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'password_hash',
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
    tableName: 'users',
    schema: 'user_module',
    underscored: true,
  },
);
