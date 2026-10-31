import "server-only";

import { getSequelize } from "@/server/db/connection";

import { Customer, initCustomer } from "./customer";
import { CustomerSession, initCustomerSession } from "./customer-session";
import { CustomerToken, initCustomerToken } from "./customer-token";

export { Customer, CustomerSession, CustomerToken };
export type { CustomerStatus } from "./customer";
export type { CustomerTokenType } from "./customer-token";

let initialised: object | undefined;

/**
 * Sets the models up on first use (not at import time, so a build without
 * database settings still works). Repositories call this; nothing else should
 * touch the models.
 */
export function ensureModels(): void {
  const sequelize = getSequelize();
  // A new Sequelize instance (after a hot reload) needs the models attached again.
  if (initialised === sequelize) return;

  initCustomer(sequelize);
  initCustomerSession(sequelize);
  initCustomerToken(sequelize);

  Customer.hasMany(CustomerSession, { foreignKey: "customerId" });
  CustomerSession.belongsTo(Customer, { foreignKey: "customerId" });
  Customer.hasMany(CustomerToken, { foreignKey: "customerId" });
  CustomerToken.belongsTo(Customer, { foreignKey: "customerId" });

  initialised = sequelize;
}
