import "server-only";

import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
  type Sequelize,
} from "sequelize";

export type CustomerTokenType = "reset_password" | "verify_email";

export class CustomerToken extends Model<
  InferAttributes<CustomerToken>,
  InferCreationAttributes<CustomerToken>
> {
  declare id: CreationOptional<string>;
  declare customerId: string;
  declare type: CustomerTokenType;
  declare tokenHash: string;
  declare createdAt: CreationOptional<Date>;
  declare expiresAt: Date;
  declare usedAt: CreationOptional<Date | null>;
}

export function initCustomerToken(sequelize: Sequelize): void {
  CustomerToken.init(
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: sequelize.literal("gen_random_uuid()"),
      },
      customerId: { type: DataTypes.UUID, allowNull: false },
      type: { type: DataTypes.TEXT, allowNull: false },
      tokenHash: { type: DataTypes.TEXT, allowNull: false },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      expiresAt: { type: DataTypes.DATE, allowNull: false },
      usedAt: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      tableName: "customer_tokens",
      modelName: "CustomerToken",
      updatedAt: false,
    },
  );
}
