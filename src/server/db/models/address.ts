import "server-only";

import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
  type Sequelize,
} from "sequelize";

export class Address extends Model<
  InferAttributes<Address>,
  InferCreationAttributes<Address>
> {
  declare id: CreationOptional<string>;
  declare customerId: string;
  declare fullName: string;
  declare phone: string;
  declare country: string;
  declare city: string;
  declare address: string;
  declare zip: string;
  declare isDefault: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export function initAddress(sequelize: Sequelize): void {
  Address.init(
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: sequelize.literal("gen_random_uuid()"),
      },
      customerId: { type: DataTypes.UUID, allowNull: false },
      fullName: { type: DataTypes.TEXT, allowNull: false },
      phone: { type: DataTypes.TEXT, allowNull: false },
      country: { type: DataTypes.TEXT, allowNull: false },
      city: { type: DataTypes.TEXT, allowNull: false },
      address: { type: DataTypes.TEXT, allowNull: false },
      zip: { type: DataTypes.TEXT, allowNull: false },
      isDefault: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false },
    },
    { sequelize, tableName: "addresses", modelName: "Address" },
  );
}
