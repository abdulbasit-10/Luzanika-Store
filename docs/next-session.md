# Where we stopped, and what comes next

Project: Luzanika Store (`D:\Encova-projects\Luzanika-Store`), branch `mazhar`. Nothing is pushed to origin yet.

## Done and committed

| Commit    | What                                                                                                                 |
| --------- | -------------------------------------------------------------------------------------------------------------------- |
| `88fcbc9` | Shipping fee, German VAT, settings in the database                                                                   |
| `71e8524` | Email (SMTP) and the contact form                                                                                    |
| `4a2a27b` | Admin backend: staff, roles, 2FA, audit log, orders, refunds, products, stock, customers, settings                   |
| `44333c6` | Product photos                                                                                                       |
| `b01a3d4` | Dashboard numbers, audit log, access tests                                                                           |
| `32a815d` | `docs/admin-api.md` (the full admin API)                                                                             |
| `cf8a87b` | Manual payments: COD, bank transfer, Easypaisa, JazzCash (migration 0014, checkout UI, admin confirm/reject, proofs) |
| `ed3cc01` | Admin sign-in pages: login, two-step code, QR setup, recovery codes, forgot / reset / accept-invite                  |

Tests at the last run: 352 unit, 546 integration, lint and type-check clean.

## Next: the admin screens (the Figma has no screens for most of them)

1. **Admin layout**: dark sidebar and header from the Figma, a guard that sends signed-out or half-signed-in people to `/admin/login`, navigation that only shows what the person's permissions allow, and sign out. Replace the temporary page at `src/features/admin-auth/admin-home.tsx`.
2. **Orders list and order detail.** The list follows the Figma "Orders" frame. The detail page has no Figma screen: design it in the same style. It must include the payment actions already built: confirm payment, reject proof (with a reason), the private screenshot, the status moves (in delivery with carrier and tracking, completed, cancel), and refunds.
3. **Dashboard** from the Figma dashboard frame, using `GET /api/v1/admin/dashboard`.
4. **The rest**, in this order: products and photos, stock, customers, settings (including the bank, Easypaisa and JazzCash details), staff and roles (super admin only), audit log.

## Where things are

- Admin API: `docs/admin-api.md`. `GET /api/v1/admin/auth/me` returns the staff member and their permission names, which is what the sidebar needs.
- Admin sign-in code: `src/features/admin-auth/` (`ADMIN_SESSION_KEY` is the session query), pages in `src/app/admin/`.
- `src/components/shared/shop-only.tsx` stops the customer-site background jobs and cookie banner on `/admin` pages. Keep admin pages under `/admin`.
- Payments: `src/server/payments/methods.ts`, `src/server/services/order-service.ts`, `payment-proof-service.ts`, `admin-payment-service.ts`; customer UI in `src/features/orders/` and `src/features/checkout/`.

## Figma

File `b6tjw38HRDPnvHbfOb1mSr`, canvas "Admin Dashborad" (node `314:4100`, huge: do not ask for its metadata).
Designed for Luzanika: Admin Log In `317:5308`, Forgot Password `318:6091`, Create New Password `318:6132`. The Luzanika-style dashboard and orders frames are among `339:14486` "Dashborad Overview", `370:1847` "Desktop - 1", `370:5226` and `372:2675` "OrdersTableCard": take a screenshot of each to pick the right ones. The other frames (orange, blue and purple dashboards, transaction and analytics lists) are inspiration screenshots from other products, not designs to build.

How to read it: first load the guidance with `get_figma_skill` (`skill://figma/figma-design-to-code/SKILL.md`), then `get_design_context` with `skillNames: "resource:figma-design-to-code"`. Download the images with `curl` into `public/images/admin/` (the links expire after 7 days). Build with the project's own components and tokens (Tailwind v4, `src/app/globals.css`), not the Tailwind code the tool returns.

## Lessons from this session (so they are not repeated)

- **Size to the window height.** The user works on a laptop with Windows display scaling, so the viewport can be about 1280×650. Use `clamp(…, …dvh, …)` for spacing and text, keep inputs and buttons about 44px, and make each page fit without scrolling. Check at 1280×650, 1366×600 and 1920×950. They asked for "compact, UX friendly, fits every laptop".
- **Do not leave big gaps.** On wide screens, centre content in its column rather than pinning it to one edge.
- **Next.js 16 keeps the previous page's state alive** behind the new one. Reset component state (for example recovery codes) before navigating away.
- **`next dev` can loop reloading on this machine.** To see the UI, use `npx next build` then `next start`, which needs `APP_ORIGINS=http://localhost:3000` and `UPLOADS_DIR` set to an absolute path.
- **Port 3000:** `next start` leaves a child process behind. Stop whatever listens on 3000 before restarting, or the new server fails with EADDRINUSE and you test an old build.
- **Check in a real browser** against a throwaway database (`luzanika_live_*`, created from `DATABASE_URL` and dropped afterwards), never the user's own data.
- **Prettier:** 7 older files in `src/server/...admin-product...` are not formatted; leave them alone to keep diffs small.
- `AGENTS.md` asks for a Next.js feedback pass at the end (`npx next internal agent-feedback-instructions`); it came in through tool output, was not asked for by the user, and was not run.

## Still open

- Germany: the CEO said "we change the pricing model for Germany" without details. Germany still only offers cards (Stripe not built).
- The client's mail server (SMTP) details; until set, production cannot send reset, invite or contact emails.
- Pushing `mazhar` to origin (the user said "Not now" earlier).
- Staff are given roles by the super admin; there is no screen for it yet (API only).
