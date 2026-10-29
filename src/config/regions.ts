import type { RegionCode, RegionConfig } from "@/types/region";

export const REGIONS: Record<RegionCode, RegionConfig> = {
  PK: {
    code: "PK",
    name: "Pakistan",
    currency: "PKR",
    defaultLocale: "en-PK",
  },
  DE: {
    code: "DE",
    name: "Germany",
    currency: "EUR",
    defaultLocale: "de-DE",
  },
};

export const REGION_LIST: RegionConfig[] = Object.values(REGIONS);

export const DEFAULT_REGION: RegionCode = "PK";
