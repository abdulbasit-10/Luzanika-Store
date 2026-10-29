# Luzanika Store (Frontend)

Storefront for a fashion e-commerce website serving **Pakistan (PKR)** and **Germany (EUR)**. It consumes a separate Express REST API.

**Stack:** Next.js (App Router) · React · TypeScript (strict) · Tailwind CSS v4 · TanStack Query · Zustand · Axios · React Hook Form · Zod · Lucide React

> This project uses a Next.js version with breaking changes. Read the guides in `node_modules/next/dist/docs/` before writing framework-level code (see `AGENTS.md`).

## Getting started

```bash
npm install
cp .env.example .env.local   # PowerShell: Copy-Item .env.example .env.local
npm run dev                  # http://localhost:3000
```

Requires Node.js 20.9+ and a running backend API for data-driven pages.

## Environment variables

| Variable               | Required | Description                                                          |
| ---------------------- | -------- | -------------------------------------------------------------------- |
| `NEXT_PUBLIC_API_URL`  | Yes      | Express API base URL, e.g. `http://localhost:5000/api/v1`            |
| `NEXT_PUBLIC_SITE_URL` | No       | Public storefront URL for metadata (default `http://localhost:3000`) |

Variables are validated with Zod in `src/config/env.ts`; the app fails fast if they are missing or invalid.

## Scripts

| Command                | Purpose                           |
| ---------------------- | --------------------------------- |
| `npm run dev`          | Start the development server      |
| `npm run build`        | Production build                  |
| `npm run start`        | Serve the production build        |
| `npm run lint`         | ESLint                            |
| `npm run typecheck`    | TypeScript check (`tsc --noEmit`) |
| `npm run format`       | Format with Prettier              |
| `npm run format:check` | Check formatting                  |

## Project structure

```
src/
  app/         Routes, layouts, loading/error/not-found (Server Components by default)
  config/      env validation, region config, site metadata
  lib/         Axios client (api-client.ts), QueryClient factory
  providers/   Client providers (TanStack Query)
  stores/      Zustand stores (client UI state only)
  types/       Shared types (regions, prices)
  utils/       Pure helpers (currency formatting)
```

Add `components/{ui,layout,shared}`, `features/*`, `hooks/` and `services/` when the corresponding Figma designs are built. Import with the `@/` alias (maps to `src/`).

## Architecture notes

- **Server vs client:** pages and layouts are Server Components; add `"use client"` only for interactivity or client hooks.
- **API:** all requests go through `apiClient` in `src/lib/api-client.ts` (base URL, 15s timeout, errors normalized to `ApiError`). Put per-resource calls in `src/services/`. Authentication is not implemented yet; add it via request interceptors.
- **Server state vs UI state:** API data lives in TanStack Query. Zustand (`src/stores/ui-store.ts`) holds only UI state (selected region, mobile nav, cart drawer). Do not copy query data into stores.
- **Regions:** `src/config/regions.ts` is the single source for PK/DE, currency and default locale. Region and language are independent. Prices come from the backend per region (`RegionalPrice`); there are no exchange rates or automatic geolocation on the frontend.
- **Currency:** `formatCurrency` / `formatRegionalPrice` in `src/utils/format-currency.ts` wrap `Intl.NumberFormat`.
- **Design tokens:** CSS variables and Tailwind `@theme` values (colors, fonts, spacing, radius, shadows, breakpoints, container widths) live in `src/app/globals.css`. They are neutral defaults until Figma specs are applied. Shared control styles are `.btn-primary`, `.btn-secondary`, `.input` and `.product-card`.
