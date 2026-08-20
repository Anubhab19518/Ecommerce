import { DataTypes, type Model, type Optional } from 'sequelize';
import { getSequelize } from '@infrastructure/database/connection';

// ─────────────────────────────────────────────────────────────
// Authorization Module — Sequelize Model Definitions
// ─────────────────────────────────────────────────────────────
// All tables live in the `authorization_module` schema.
// NEVER exported from the module barrel (index.ts).
// ─────────────────────────────────────────────────────────────

const SCHEMA = 'authorization_module';

// ========================= Role =========================

export interface RoleAttributes {
  id: string;
  name: string;
  description: string;
  parentRoleId: string | null;
  isActive: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export type RoleCreationAttributes = Optional<
  RoleAttributes,
  'id' | 'parentRoleId' | 'isActive' | 'metadata' | 'createdAt' | 'updatedAt'
>;
export type RoleModel = Model<RoleAttributes, RoleCreationAttributes> & RoleAttributes;

export const RoleModelDef = getSequelize().define<RoleModel>(
  'Role',
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
    description: {
      type: DataTypes.STRING(500),
      allowNull: false,
      defaultValue: '',
    },
    parentRoleId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: { tableName: 'roles', schema: SCHEMA }, key: 'id' },
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null,
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
    tableName: 'roles',
    schema: SCHEMA,
    underscored: true,
  },
);

// Self-referencing association for role hierarchy
RoleModelDef.belongsTo(RoleModelDef, {
  as: 'parentRole',
  foreignKey: 'parentRoleId',
});
RoleModelDef.hasMany(RoleModelDef, {
  as: 'childRoles',
  foreignKey: 'parentRoleId',
});

// ========================= Permission =========================

export interface PermissionAttributes {
  id: string;
  action: string;
  subject: string;
  fields: string[] | null;
  conditionsJson: Record<string, unknown> | null;
  inverted: boolean;
  reason: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type PermissionCreationAttributes = Optional<
  PermissionAttributes,
  | 'id'
  | 'fields'
  | 'conditionsJson'
  | 'inverted'
  | 'reason'
  | 'isActive'
  | 'createdAt'
  | 'updatedAt'
>;
export type PermissionModel = Model<PermissionAttributes, PermissionCreationAttributes> &
  PermissionAttributes;

export const PermissionModelDef = getSequelize().define<PermissionModel>(
  'Permission',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    action: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    subject: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    fields: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null,
    },
    conditionsJson: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null,
    },
    inverted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    reason: {
      type: DataTypes.STRING(500),
      allowNull: true,
      defaultValue: null,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
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
    tableName: 'permissions',
    schema: SCHEMA,
    underscored: true,
  },
);

// ========================= RolePermission (M2M join) =========================

export interface RolePermissionAttributes {
  id: string;
  roleId: string;
  permissionId: string;
  createdAt: Date;
}

export type RolePermissionCreationAttributes = Optional<
  RolePermissionAttributes,
  'id' | 'createdAt'
>;
export type RolePermissionModel = Model<
  RolePermissionAttributes,
  RolePermissionCreationAttributes
> &
  RolePermissionAttributes;

export const RolePermissionModelDef = getSequelize().define<RolePermissionModel>(
  'RolePermission',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    roleId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: { tableName: 'roles', schema: SCHEMA }, key: 'id' },
    },
    permissionId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: { tableName: 'permissions', schema: SCHEMA }, key: 'id' },
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'role_permissions',
    schema: SCHEMA,
    underscored: true,
    updatedAt: false,
  },
);

// M2M associations
RoleModelDef.belongsToMany(PermissionModelDef, {
  through: RolePermissionModelDef,
  foreignKey: 'roleId',
  otherKey: 'permissionId',
  as: 'permissions',
});
PermissionModelDef.belongsToMany(RoleModelDef, {
  through: RolePermissionModelDef,
  foreignKey: 'permissionId',
  otherKey: 'roleId',
  as: 'roles',
});

// ========================= UserRole (M2M join) =========================

export interface UserRoleAttributes {
  id: string;
  userId: string;
  roleId: string;
  scope: string | null;
  assignedAt: Date;
  expiresAt: Date | null;
}

export type UserRoleCreationAttributes = Optional<
  UserRoleAttributes,
  'id' | 'scope' | 'assignedAt' | 'expiresAt'
>;
export type UserRoleModel = Model<UserRoleAttributes, UserRoleCreationAttributes> &
  UserRoleAttributes;

export const UserRoleModelDef = getSequelize().define<UserRoleModel>(
  'UserRole',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    roleId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: { tableName: 'roles', schema: SCHEMA }, key: 'id' },
    },
    scope: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null,
    },
    assignedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    tableName: 'user_roles',
    schema: SCHEMA,
    underscored: true,
    createdAt: 'assignedAt',
    updatedAt: false,
  },
);

// UserRole → Role association
UserRoleModelDef.belongsTo(RoleModelDef, { foreignKey: 'roleId', as: 'role' });
RoleModelDef.hasMany(UserRoleModelDef, { foreignKey: 'roleId', as: 'userRoles' });

// ========================= PermissionCondition (named templates) =========================

export interface PermissionConditionAttributes {
  id: string;
  name: string;
  description: string;
  template: Record<string, unknown>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type PermissionConditionCreationAttributes = Optional<
  PermissionConditionAttributes,
  'id' | 'description' | 'isActive' | 'createdAt' | 'updatedAt'
>;
export type PermissionConditionModel = Model<
  PermissionConditionAttributes,
  PermissionConditionCreationAttributes
> &
  PermissionConditionAttributes;

export const PermissionConditionModelDef = getSequelize().define<PermissionConditionModel>(
  'PermissionCondition',
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
    description: {
      type: DataTypes.STRING(500),
      allowNull: false,
      defaultValue: '',
    },
    template: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
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
    tableName: 'permission_conditions',
    schema: SCHEMA,
    underscored: true,
  },
);
