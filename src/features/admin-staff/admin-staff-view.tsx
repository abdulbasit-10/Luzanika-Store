"use client";

import { useState } from "react";

import { useAdminSession } from "@/features/admin-shell/admin-session";
import { AdminPageHead } from "@/features/admin-shell/admin-shell";
import { cn } from "@/utils/cn";

import { RolesTab } from "./roles-tab";
import { StaffTab } from "./staff-tab";

/** Staff & roles: who works in the admin, and what each role may do. Super admins only. */
export function AdminStaffView() {
  const { staff } = useAdminSession();
  const [tab, setTab] = useState<"staff" | "roles">("staff");

  const tabClass = (active: boolean) =>
    cn(
      "rounded-lg px-4 py-1.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
      active
        ? "bg-foreground text-white"
        : "border border-border bg-white text-foreground hover:bg-muted",
    );

  return (
    <div className="mx-auto flex h-full w-full max-w-[75rem] flex-col gap-[clamp(0.5rem,1.8dvh,1.6rem)]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <AdminPageHead
          title="Staff & roles"
          subtitle="Who can sign in to the admin, and what each person may do."
        />
        {staff.isSuperAdmin ? (
          <div
            role="tablist"
            aria-label="Staff or roles"
            className="flex gap-2"
          >
            <button
              type="button"
              role="tab"
              aria-selected={tab === "staff"}
              onClick={() => setTab("staff")}
              className={tabClass(tab === "staff")}
            >
              Staff
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "roles"}
              onClick={() => setTab("roles")}
              className={tabClass(tab === "roles")}
            >
              Roles
            </button>
          </div>
        ) : null}
      </div>
      {staff.isSuperAdmin ? (
        tab === "staff" ? (
          <StaffTab />
        ) : (
          <RolesTab />
        )
      ) : (
        <p className="text-sm text-muted-foreground">
          Only a super admin can manage staff and roles.
        </p>
      )}
    </div>
  );
}
