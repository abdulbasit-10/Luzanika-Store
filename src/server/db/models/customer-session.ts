import "server-only";

import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
  type Sequelize,
} from "sequelize";

export class CustomerSession extends Model<
  InferAttributes<CustomerSession>,
  InferCreationAttributes<CustomerSession>
> {
  declare id: CreationOptional<string>;
  declare customerId: string;
  declare tokenHash: string;
  declare ip: CreationOptional<string | null>;
  declare userAgent: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;
  declare lastUsedAt: CreationOptional<Date>;
  declare expiresAt: Date;
  declare revokedAt: CreationOptional<Date | null>;
}

export function initCustomerSession(sequelize: Sequelize): void {
  CustomerSession.init(
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: sequelize.literal("gen_random_uuid()"),
      },
      customerId: { type: DataTypes.UUID, allowNull: false },
      tokenHash: { type: DataTypes.TEXT, allowNull: false },
      ip: { type: DataTypes.INET, allowNull: true },
      userAgent: { type: DataTypes.TEXT, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      lastUsedAt: { type: DataTypes.DATE, allowNull: false },
      expiresAt: { type: DataTypes.DATE, allowNull: false },
      revokedAt: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      tableName: "customer_sessions",
      modelName: "CustomerSession",
      // The table has no updated_at column.
      updatedAt: false,
    },
  );
}
