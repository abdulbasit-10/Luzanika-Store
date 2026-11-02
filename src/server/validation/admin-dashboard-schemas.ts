import "server-only";

import { z } from "zod";

import { dateParam, pageQuery } from "@/server/validation/admin-order-schemas";

const DAY_MS = 24 * 60 * 60 * 1000;
export const DASHBOARD_DEFAULT_DAYS = 30;
export const DASHBOARD_MAX_DAYS = 366;

/**
 * The dashboard shows one period, by default the last 30 days up to and
 * including today (days are UTC days). `market` limits everything to one market.
 */
export const dashboardQuerySchema = z
  .object({
    market: z.enum(["PK", "DE"]).optional(),
    from: dateParam("start", false).optional(),
    to: dateParam("end", true).optional(),
  })
  .refine((value) => !value.from || !value.to || value.from < value.to, {
    message: "The start must be before the end",
    path: ["from"],
  })
  .refine(
    (value) =>
      !value.from ||
      !value.to ||
      value.to.getTime() - value.from.getTime() <= DASHBOARD_MAX_DAYS * DAY_MS,
    {
      message: `Choose a period of at most ${DASHBOARD_MAX_DAYS} days`,
      path: ["to"],
    },
  );

export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;

export const auditListQuerySchema = z.object({
  staffId: z.uuid().optional(),
  entityType: z.string().trim().min(1).max(60).optional(),
  entityId: z.string().trim().min(1).max(120).optional(),
  action: z.string().trim().min(1).max(80).optional(),
  from: dateParam("start", false).optional(),
  to: dateParam("end", true).optional(),
  ...pageQuery,
});
