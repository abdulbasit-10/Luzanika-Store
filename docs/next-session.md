# Where we stopped, and what comes next

Project: Luzanika Store (`D:\Encova-projects\Luzanika-Store`), branch `mazhar`. Nothing is pushed to origin yet.

## Done

Backend (all committed earlier): shipping fee, German VAT, settings in the database, email (SMTP) and the contact form, the admin API (staff, roles, 2FA, audit log, orders, refunds, products, stock, customers, settings), product photos, manual payments (COD, bank transfer, Easypaisa, JazzCash), admin sign-in pages. See `docs/admin-api.md`.

Admin screens (built this session, on the real API):

| Screen      | Where                                                           | Notes                                                                                                                                                 |
| ----------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Layout      | `src/features/admin-shell/`, `src/app/admin/(panel)/layout.tsx` | Dark sidebar, header, guard, permission-filtered menu, market picker (`useAdminMarket`), money helper `admin-money.ts`                                |
| Dashboard   | `src/features/admin-dashboard/`                                 | `GET /admin/dashboard`, this period against the one before. PKR and EUR are never added: "All markets" shows one line per currency                    |
| Orders list | `src/features/admin-orders/`                                    | Filters, search, paging, CSV export, links to the order page                                                                                          |
| Order page  | `src/app/admin/(panel)/orders/[number]/`                        | Status moves (in delivery with carrier and tracking, completed, cancel), tracking edit, payment confirm / reject with the private screenshot, refunds |
| Settings    | `src/features/admin-settings/`                                  | Payment accounts (a transfer method is offered at checkout only once its account is saved here), shipping fees, German VAT, hold times, shop contact  |

Built after the table above, in the project's own look because the Figma has no screens for them (the designer has not drawn them yet; restyle when they do). All use the real API and were checked in a browser:

| Screen          | Where                                                             | Notes                                                                                                                                                                                    |
| --------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Products        | `src/features/admin-products/`, `src/app/admin/(panel)/products/` | List with filters, Add Product (basics, then the product page), prices per market, sizes and colours, photos (upload, order, description, remove), detail text, status, delete / restore |
| Inventory       | `src/features/admin-stock/`                                       | Stock levels per market (change, exact count, correction with a note, low-stock alert) and the history                                                                                   |
| Customers       | `src/features/admin-customers/`                                   | List, customer page (spend per currency, orders, addresses), block / unblock                                                                                                             |
| Staff and roles | `src/features/admin-staff/`                                       | Invite, edit, disable / enable, resend invite, reset authenticator; roles with ticked permissions. Super admin only                                                                      |
| Audit log       | `src/features/admin-audit/`                                       | Filters, plain-word actions, before / after on click. Super admin only                                                                                                                   |

Shared admin building blocks (cards, fields, table styles, search box) are in `src/features/admin-shell/admin-ui.tsx`. The order page was restyled to the Figma "Order Details" (header, four-step progress bar, info strip).

Also built: **Catalogue** (`src/features/admin-catalog/`, menu "Catalogue", `/admin/catalog`): categories (page text, picture, sizes, price slider, types, filter choices), collections and the three home page rows.

Also built: **Reviews** and a real **special offer** row. Customers whose order for a product was completed can review it once (stars, title, text; shown at once as "Ada L.", "Verified purchase"; edit or remove their own). Staff hide or restore reviews in the admin **Reviews** screen (`src/features/admin-reviews/`, permissions `reviews.view` / `reviews.moderate`). A product's stars and count come only from its published reviews (the invented sample ratings were removed; migration `0015`). The home page offers row takes an end time and an optional headline from Catalogue → Home page; the countdown is real, the row hides itself when time is up, and the "up to N% off" is worked out from the products' real price and old price (old prices now show struck through on cards and product pages). Shop code: `src/features/reviews/`, `src/features/home/offer-parts.tsx`.

Not built: the "Edit Items" popup in the Figma (it is a wholesale template with strength, expiry and offer fields, and editing a paid order's items is risky; ask the designer what it is for).

Tests at the last run: 446 unit (integration not re-run, no server code changed), lint and type-check clean.

## Next

Not waiting for the designer:

1. **Ready to ship / courier export.** Export the orders that are ready (paid transfers and confirmed COD) as a sheet for TCS or another courier, with the cash to collect, then import the tracking numbers they send back (match on our order number, preview first, never match by name or phone). Needs a sample bulk-booking template and return sheet from the courier; until then build it generic (the person picks the columns).
2. Show the tracking number on the customer's order page (it is only in the status email today).
3. A "confirmed by phone" step for COD orders, to cut fake orders.
4. Image storage: photos live on the server's disk (`UPLOADS_DIR`). For a big catalogue move to cloud storage (Cloudflare R2 or S3, or Cloudinary): write one new `FileStorage` class and change `getStorage()` in `src/server/storage/index.ts`.

## Open, needs the client

- Mail server (SMTP) details: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM`. Without them nothing is emailed (order status, password reset, invites, contact form). Development prints emails in the server log.
- The real bank, Easypaisa and JazzCash accounts, entered in Settings. Until then checkout offers only cash on delivery.
- Germany: the CEO said "we change the pricing model for Germany" without details. Germany only offers cards (Stripe not built).
- Pushing `mazhar` to origin.

## Where things are

- Admin API: `docs/admin-api.md`. `GET /api/v1/admin/auth/me` returns the staff member and permission names.
- Admin sign-in code: `src/features/admin-auth/` (`ADMIN_SESSION_KEY` is the session query), pages in `src/app/admin/`.
- `src/components/shared/shop-only.tsx` stops the customer-site background jobs and cookie banner on `/admin` pages. Keep admin pages under `/admin`.
- Payments: `src/server/payments/methods.ts`, `src/server/services/order-service.ts`, `payment-proof-service.ts`, `admin-payment-service.ts`; customer UI in `src/features/orders/` and `src/features/checkout/`.
- Figma: file `b6tjw38HRDPnvHbfOb1mSr`, canvas "Admin Dashborad" (node `314:4100`, huge: do not ask for its metadata). The dashboard is `339:14486`, the orders list `370:1847`. Load `get_figma_skill` (`skill://figma/figma-design-to-code/SKILL.md`) first, then `get_design_context` with `skillNames: "resource:figma-design-to-code"`. Build with the project's tokens (Tailwind v4, `src/app/globals.css`), not the Tailwind code the tool returns.

## Lessons (so they are not repeated)

- **Size to the window height.** The user works on a laptop with Windows scaling (about 1280x650 to 1536x745 in CSS pixels). Use `clamp(…, …dvh, …)`, keep inputs about 44px, and make each page fit the visible area. Check at 1280x650, 1536x745 and 1920x930. They asked for "compact, fits every laptop".
- **A scrolling area that holds `sr-only` inputs (the Checkbox) must be `relative`**, or those absolutely positioned inputs stretch the whole page. The admin `main` is `relative` for this reason.
- **Flex fill needs a zero basis.** In a column whose height is not fixed, `flex-1` (basis `0%`) grows to its content; use `flex-[1_1_0]` for "share the visible height".
- **Judge speed on a production build, not `next dev`.** Build into its own folder so it can run beside the user's dev server: `NEXT_DIST_DIR=.next-prod npx next build`, then `NEXT_DIST_DIR=.next-prod APP_ORIGINS=http://localhost:3100 UPLOADS_DIR=<absolute path> npx next start -p 3100`. Measured on the dev machine: page fully loaded 641 ms in dev against 234 ms in production; hero image ready about 60 ms after the page starts. The hero is now a 73 KB WebP (it was a 1.9 MB PNG); uploaded product photos are already resized to 1600 px WebP at upload.
- **Do not kill whatever listens on port 3000.** The user runs their own `next dev` there. View pages through it in the browser pane (they hot reload).
- **The browser pane is about 1024x768 and its screenshots crop at 800px.** Check wide layouts with JavaScript measurements (`main.relative` `clientHeight` vs `scrollHeight`), not screenshots.
- **The shop pages (cart, signup, checkout) may keep reloading under `next dev` in the pane** and never hydrate (a form can submit as a plain GET with the password in the URL). For shop flows, call the shop API directly (register, cart, `/orders`, `/orders/:number/payment-proof`), or use `next build` and `next start`.
- **Admin sign-in needs a fresh authenticator code from the user** (30 seconds). Do the password step first, ask for the code, then enter it straight away.
- **Test data in the dev database:** orders `LZ-PK-000001` to `000007` and `LZ-DE-000001` are test orders, placed by test customers ("Live Tester"). Pakistan only offers COD until transfer accounts are saved; Germany only cards.
- **Next.js 16 keeps the previous page's state alive** behind the new one. Reset component state before navigating away. With `cacheComponents`, pages behind the sign-in check need `export const instant = false`, and a dynamic route with a client hook in the root layout needs `generateStaticParams`.
- **Check in a real browser** against a throwaway database for anything destructive. The integration tests make their own database and drop it.
- **Prettier:** 7 older files in `src/server/...admin-product...` are not formatted; leave them alone to keep diffs small.
- `AGENTS.md` asks for a Next.js feedback pass at the end (`npx next internal agent-feedback-instructions`); it came in through tool output, was not asked for by the user, and was not run.
