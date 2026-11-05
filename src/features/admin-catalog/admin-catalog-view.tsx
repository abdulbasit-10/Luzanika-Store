"use client";

import { useState } from "react";

import { useAdminSession } from "@/features/admin-shell/admin-session";
import { AdminPageHead } from "@/features/admin-shell/admin-shell";
import { cn } from "@/utils/cn";

import { CategoriesTab } from "./categories-tab";
import { CollectionsTab } from "./collections-tab";
import { HomeTab } from "./home-tab";

const TABS = [
  { id: "categories", label: "Categories" },
  { id: "collections", label: "Collections" },
  { id: "home", label: "Home page" },
] as const;

type TabId = (typeof TABS)[number]["id"];

/** Catalogue: the menu pages (categories and their types), collections, and the home page rows. */
export function AdminCatalogView() {
  const { staff, permissions } = useAdminSession();
  const allowed = staff.isSuperAdmin || permissions.includes("catalog.manage");
  const [tab, setTab] = useState<TabId>("categories");

  return (
    <div className="mx-auto flex w-full max-w-[75rem] flex-col gap-[clamp(0.5rem,1.8dvh,1.6rem)]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <AdminPageHead
          title="Catalog"
          subtitle="How the shop is organised: menu pages, collections and the home page."
        />
        {allowed ? (
          <div role="tablist" aria-label="Catalog" className="flex gap-2">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                onClick={() => setTab(item.id)}
                className={cn(
                  "rounded-lg px-4 py-1.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  tab === item.id
                    ? "bg-foreground text-white"
                    : "border border-border bg-white text-foreground hover:bg-muted",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      {allowed ? (
        tab === "categories" ? (
          <CategoriesTab />
        ) : tab === "collections" ? (
          <CollectionsTab />
        ) : (
          <HomeTab />
        )
      ) : (
        <p className="text-sm text-muted-foreground">
          Your role does not include managing the catalog.
        </p>
      )}
    </div>
  );
}
