"use client";

import { ChevronDown } from "lucide-react";

import { Dropdown } from "@/components/ui/dropdown";
import { RegionFlag } from "@/components/shared/region-flag";
import { REGION_LIST, REGIONS } from "@/config/regions";
import { useUiStore } from "@/stores/ui-store";
import { cn } from "@/utils/cn";

export function RegionSelector() {
  const region = useUiStore((state) => state.region);
  const setRegion = useUiStore((state) => state.setRegion);

  return (
    <Dropdown
      align="end"
      triggerLabel="Select region"
      triggerClassName="gap-1.5 text-sm font-medium"
      trigger={
        <>
          <RegionFlag region={region} />
          {REGIONS[region].currency}
          <ChevronDown aria-hidden className="size-3.5" />
        </>
      }
    >
      <ul>
        {REGION_LIST.map((item) => (
          <li key={item.code}>
            <button
              type="button"
              aria-pressed={item.code === region}
              onClick={() => setRegion(item.code)}
              className={cn(
                "flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-muted",
                item.code === region && "font-semibold",
              )}
            >
              <RegionFlag region={item.code} />
              {item.name} ({item.currency})
            </button>
          </li>
        ))}
      </ul>
    </Dropdown>
  );
}
