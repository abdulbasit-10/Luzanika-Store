import "server-only";

import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
  type Sequelize,
} from "sequelize";

export type CustomerStatus = "active" | "blocked" | "anonymised";

export class Customer extends Model<
  InferAttributes<Customer>,
  InferCreationAttributes<Customer>
> {
  declare id: CreationOptional<string>;
  declare email: string;
  declare emailVerifiedAt: CreationOptional<Date | null>;
  declare passwordHash: string;
  declare firstName: string;
  declare lastName: string;
  declare phone: CreationOptional<string | null>;
  declare gender: CreationOptional<string | null>;
  declare dateOfBirth: CreationOptional<string | null>;
  declare language: CreationOptional<string>;
  declare avatarKey: CreationOptional<string | null>;
  declare status: CreationOptional<CustomerStatus>;
  declare lastLoginAt: CreationOptional<Date | null>;
  declare anonymisedAt: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export function initCustomer(sequelize: Sequelize): void {
  Customer.init(
    {
      // Defaults and checks live in the database; these definitions only describe the columns.
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: sequelize.literal("gen_random_uuid()"),
      },
      email: { type: DataTypes.CITEXT, allowNull: false },
      emailVerifiedAt: { type: DataTypes.DATE, allowNull: true },
      passwordHash: { type: DataTypes.TEXT, allowNull: false },
      firstName: { type: DataTypes.TEXT, allowNull: false },
      lastName: { type: DataTypes.TEXT, allowNull: false },
      phone: { type: DataTypes.TEXT, allowNull: true },
      gender: { type: DataTypes.TEXT, allowNull: true },
      dateOfBirth: { type: DataTypes.DATEONLY, allowNull: true },
      language: { type: DataTypes.TEXT, allowNull: false, defaultValue: "en" },
      avatarKey: { type: DataTypes.TEXT, allowNull: true },
      status: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: "active",
      },
      lastLoginAt: { type: DataTypes.DATE, allowNull: true },
      anonymisedAt: { type: DataTypes.DATE, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false },
    },
    { sequelize, tableName: "customers", modelName: "Customer" },
  );
}
