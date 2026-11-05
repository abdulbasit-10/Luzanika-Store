# Luzanika admin API

JSON API for running the shop: orders, products and catalogue, stock,
customers, settings, staff. Everything is under `/api/v1/admin`. The admin
screens in `src/app/admin/` use all of it.

Staff work on **one dashboard for both markets** (Pakistan `PK` / PKR and
Germany `DE` / EUR). There are no exchange rates, so **PKR and EUR are never
added together**: every money figure is per market.

## Conventions

| Topic        | Rule                                                                                                                                                                 |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Money        | Whole **minor units** (paisa / cents) as integers, in the currency of the market the figure belongs to.                                                              |
| Dates        | ISO 8601 strings. A query `from` / `to` may be a day (`2026-11-02`) or a full time; a plain `to` day includes that whole day. Days in the dashboard are UTC days.    |
| Ids          | UUIDs. Orders are addressed by their number (`LZ-...`). A malformed id answers `404`, exactly like one that does not exist.                                          |
| Lists        | `page` (from 1) and `pageSize` (default 25, at most 100). Answer: `{ items, total, page, pageSize }`.                                                                |
| Changes      | `PATCH` changes only the fields sent. Unknown fields are refused (`400`). Every write is recorded in the audit log in the same database transaction as the change.   |
| Request body | JSON (`Content-Type: application/json`, up to 100 KB), except photo upload (multipart).                                                                              |
| Cross-site   | Writes must come from the site's own origin (checked with `Origin`); otherwise `403 csrf_failed`.                                                                    |
| Rate limits  | Every route is limited per visitor (300 / minute). Sign-in, code guesses, invites and uploads have stricter limits and answer `429 rate_limited` with `Retry-After`. |
| Shop caching | Catalogue and stock writes refresh the shop's cached pages at once.                                                                                                  |

### Errors

Every error has the same shape:

```json
{
  "error": {
    "code": "validation_failed",
    "message": "Please check the highlighted fields.",
    "fields": { "sku": "This SKU is already used" },
    "requestId": "..."
  }
}
```

`fields` is present for form errors. `requestId` is also the id stored with
audit rows, so a support question can be traced.

| Status | `code`                                   | Meaning                                                            |
| ------ | ---------------------------------------- | ------------------------------------------------------------------ |
| 400    | `validation_failed`, `bad_request`       | Wrong or missing fields (see `fields`).                            |
| 401    | `unauthenticated`, `invalid_credentials` | Not signed in / wrong email or password.                           |
| 403    | `forbidden`                              | Signed in, but the staff member's roles do not allow this.         |
| 403    | `two_factor_required`                    | Password accepted, authenticator code still missing.               |
| 403    | `csrf_failed`                            | The request did not come from the site's own origin.               |
| 404    | `not_found`                              | No such thing (or a malformed id).                                 |
| 409    | `conflict`                               | Clashes with the current state (slug taken, deleted product, ...). |
| 409    | `invalid_status_transition`              | An order cannot move that way.                                     |
| 410    | `invalid_reset_link`                     | An invite or reset link is wrong, used or expired.                 |
| 413    | `payload_too_large`                      | Upload or body too large.                                          |
| 415    | `unsupported_media_type`                 | Wrong content type (a photo must be multipart).                    |
| 429    | `rate_limited`                           | Too many tries.                                                    |

## Signing in

Staff are separate from customers: their own table, login and cookie.
The cookie is `lz_staff` (`__Host-lz_staff` in production), `HttpOnly`,
`SameSite=Strict`. A session ends after **2 hours idle** or **12 hours in
total**. Passwords need **at least 12 characters**. An authenticator app
(TOTP) is required for everyone.

1. `POST /auth/login { email, password }` answers what comes next in
   `next`: `two_factor_setup` (no authenticator yet) or `two_factor_verify`.
   The cookie it sets only allows finishing that step (`403 two_factor_required`
   everywhere else).
2. New authenticator: `POST /auth/2fa/setup` returns the secret and an
   `otpauth://` link for the screen to draw as a QR code, then
   `POST /auth/2fa/enable { code }` confirms the first code, finishes the
   sign-in and returns **recovery codes, shown only this once**.
3. Existing authenticator: `POST /auth/2fa/verify { code }` or
   `{ recoveryCode }` (a recovery code works once). Five wrong tries per
   person in 15 minutes lock further guesses.
4. `GET /auth/me` says who is signed in, their permissions, and, while the
   code is missing, `stage: "pending"` and `next`.
5. `POST /auth/logout` ends the session. `POST /auth/change-password
{ currentPassword, newPassword }` signs out every other browser.

The first super admin is created from the command line, then everyone else is
invited by email:

```bash
npm run admin:create -- --email owner@example.com --first Ada --last Lovelace
```

It prints a one-time link to choose a password (no password ever goes through
the shell) and refuses to run when a super admin already exists unless
`--force` is given. It needs `STAFF_2FA_ENCRYPTION_KEY` (see `.env.example`).

| Endpoint                     | Body / notes                                                                                                           |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `POST /auth/accept-invite`   | `{ token, password }` from the emailed invite link (valid 72 hours). They then sign in and set up their authenticator. |
| `POST /auth/forgot-password` | `{ email }`. Always `204`, so it cannot be used to find out who works here. The emailed link is valid 30 minutes.      |
| `POST /auth/reset-password`  | `{ token, password }`. Signs out every browser.                                                                        |

## Permissions

Roles are made by the super admin with ticked permissions and given to staff.
Everyone sees both markets. A staff member's rights are the union of their roles.

| Permission         | Allows                                                                                         |
| ------------------ | ---------------------------------------------------------------------------------------------- |
| `dashboard.view`   | See the dashboard numbers                                                                      |
| `orders.view`      | See orders and their history                                                                   |
| `orders.manage`    | Move orders along (delivery, completed) and cancel unpaid orders                               |
| `orders.refund`    | Record refunds, including cancelling a paid order                                              |
| `payments.verify`  | Check payment proofs, confirm cash / bank / Easypaisa / JazzCash payments, see the screenshots |
| `products.view`    | See products, prices and photos                                                                |
| `products.manage`  | Create and edit products, variants, prices and photos                                          |
| `products.delete`  | Delete (hide) and restore products                                                             |
| `catalog.manage`   | Manage categories, collections and the home page sections                                      |
| `stock.view`       | See stock levels and movements                                                                 |
| `stock.adjust`     | Change stock levels                                                                            |
| `customers.view`   | See customers and their orders                                                                 |
| `customers.manage` | Block and unblock customers                                                                    |
| `reviews.view`     | See product reviews                                                                            |
| `reviews.moderate` | Publish, hide, show again and delete product reviews                                           |
| `discounts.view`   | See discounts                                                                                  |
| `discounts.manage` | Create, change, switch off and delete discounts on products                                    |
| `contact.view`     | Read messages from the contact form                                                            |
| `contact.reply`    | Answer contact form messages by email                                                          |
| `settings.view`    | See the shop settings                                                                          |
| `settings.manage`  | Change shipping fees, VAT, hold time and shop details                                          |

**Super admin only** (a role can never give these away): managing staff,
managing roles and reading the audit log. A super admin has every permission.

## Endpoints

"Permission" is what the signed-in staff member needs (`any` of several where
listed). All of them answer `401` without a finished sign-in and `403` without
the permission.

### Dashboard

| Method | Path                           | Permission       |
| ------ | ------------------------------ | ---------------- |
| GET    | `/dashboard?market=&from=&to=` | `dashboard.view` |

The period defaults to the last 30 days up to and including today (at most
366 days); `market` limits everything to one market. Answer:

```json
{
  "period": { "from": "...", "to": "...", "days": 30 },
  "markets": {
    "PK": {
      "currency": "PKR",
      "orders": {
        "total": 2,
        "byStatus": {
          "waiting_payment": 1,
          "processing": 1,
          "in_delivery": 0,
          "completed": 0,
          "cancelled": 0,
          "refunded": 0
        }
      },
      "paid": { "orders": 1, "amount": 520000 },
      "refunded": { "refunds": 1, "amount": 10000 },
      "revenue": 510000,
      "waitingPayment": 1,
      "awaitingShipment": 1,
      "series": [
        {
          "date": "2026-11-02",
          "orders": 2,
          "paidAmount": 520000,
          "refundedAmount": 10000,
          "revenue": 510000
        }
      ]
    },
    "DE": { "...": "same shape, currency EUR" }
  },
  "newCustomers": 4,
  "lowStock": [
    {
      "variantId": "...",
      "productName": "...",
      "sku": "...",
      "market": "PK",
      "onHand": 2,
      "reserved": 0,
      "available": 2,
      "lowStockThreshold": 3
    }
  ],
  "recentOrders": [
    {
      "number": "LZ-...",
      "market": "DE",
      "currency": "EUR",
      "status": "processing",
      "paymentStatus": "paid",
      "total": 5400,
      "recipient": "...",
      "email": "...",
      "placedAt": "..."
    }
  ]
}
```

`revenue` is paid minus refunds made in the period. `waitingPayment` and
`awaitingShipment` are the position right now, not limited to the period.
`lowStock` lists the 20 lowest variants that are on sale; `recentOrders` the
10 newest.

### Orders

| Method | Path                                                 | Permission        | Notes                                                                                                                                                                                                                                                   |
| ------ | ---------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/orders`                                            | `orders.view`     | Filters `market`, `status` (or `deleted`), `paymentStatus`, `from`, `to`, `search` (number, email, recipient), paging. Deleted orders are left out unless `status=deleted`. Each item has `allowedMoves` (the status dropdown's choices) and `deleted`. |
| GET    | `/orders/:number`                                    | `orders.view`     | Items, addresses, payments, status history, refunds, `amounts.refundableTotal`.                                                                                                                                                                         |
| POST   | `/orders/:number/status`                             | `orders.manage`   | See below. The customer is emailed; an email failure is logged and never undoes the change.                                                                                                                                                             |
| POST   | `/orders/:number/delete`                             | `orders.manage`   | Hides a **cancelled** order from the list (record, payments and audit stay). Anything else is `409`. There is no undo.                                                                                                                                  |
| POST   | `/orders/:number/refunds`                            | `orders.refund`   | See below.                                                                                                                                                                                                                                              |
| POST   | `/orders/:number/payment/confirm`                    | `payments.verify` | `{ note? }`. The money is there. See "Payments" below.                                                                                                                                                                                                  |
| POST   | `/orders/:number/payment/reject`                     | `payments.verify` | `{ reason }`. The customer's payment proof does not check out. See "Payments" below.                                                                                                                                                                    |
| GET    | `/orders/:number/payment-proofs/:proofId/screenshot` | `payments.verify` | The customer's screenshot (private, never cached).                                                                                                                                                                                                      |

`GET /orders/:number` also returns `paymentMethod`, `paymentActions`
(`{ canConfirm, canReject }`: what to offer right now) and `paymentProofs`.

Statuses: `waiting_payment`, `processing`, `in_delivery`, `completed`,
`cancelled`, `refunded`. Staff see them as **Pending, Processing, Shipped,
Delivered, Cancelled, Refunded** (the stored values did not change). A pending
order moves to Processing by confirming its payment. A **delivered** order is
locked: no status change, no delete (a refund for a return is still possible). Allowed moves; anything else is `409 invalid_status_transition`:

```json
{ "status": "in_delivery" }                                              // paid -> in delivery
{ "status": "completed" }                                                // in delivery -> completed
{ "status": "cancelled", "reason": "Customer asked" }                   // unpaid -> cancelled, stock goes back
```

There is no going back. A **paid** order is never cancelled here: record a
refund instead; a full refund ends it as `refunded`. The one exception is an
unpaid **cash on delivery** order: it is `processing` from the start, so while
its cash has not been collected staff can still cancel it (a fake order, a
parcel refused at the door) and its goods go back into stock.

**Refund**: `{ amount, reason, restock?, items?: [{ orderItemId, quantity }] }`.
`amount` may not exceed what is still refundable. A partial refund sets
`payment_status` to `partially_refunded`. With `restock: true` the returned
items go back into stock (list them in `items`, or leave `items` out to put
back everything not yet back) and a `return` row is written to the stock
ledger. No money moves until a payment provider exists; the record is the
bookkeeping.

### Payments (cash on delivery, bank transfer, Easypaisa, JazzCash)

There is no payment gateway for these: the customer pays outside the shop and
staff confirm it. Pakistan only; Germany keeps cards. The customer chooses at
checkout (`GET /api/v1/payment-methods?market=PK` lists what is offered; a
transfer method is only offered once its account is set in the settings).

| Method                                   | At checkout                                                                                                                            | Staff                                                                                                                                  |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `cod`                                    | The order goes straight to `processing`, payment `pending`; the goods are sold now. No limit.                                          | Phone the customer if needed, ship, then `payment/confirm` when the courier hands over the cash. Until then it can still be cancelled. |
| `bank_transfer`, `easypaisa`, `jazzcash` | The order is `waiting_payment` and holds its stock for `payments.manualHoldHours` (default 48). The customer sees the account details. | See below.                                                                                                                             |

**Transfers.** After sending the money, the customer posts a transaction ID
and/or a screenshot to `POST /api/v1/orders/:number/payment-proof` (multipart:
`transactionId`, `screenshot`; at least one). The payment becomes
`awaiting_verification`, and the order keeps its stock until staff decide (it
does not expire while waiting). Staff then:

- `payment/confirm`: sold stock, `processing`, payment `paid`, the proof is
  `approved`, the customer is emailed. Also works for a customer who paid but
  sent no proof (staff saw the money in the bank app).
- `payment/reject { reason }`: payment `failed`, the reason is emailed and shown to
  the customer, the order gets a fresh hold time, and the customer can send a
  new proof (at most 5 per order).

A transaction ID cannot pay two orders (a rejected one can be used again).
Screenshots are re-encoded to WebP (max 2000 px) and kept in private storage
(`payment-proofs/…`): only `payments.verify` can see them, never the public
photo address. Everything is written to the audit log (`orders.payment_confirm`,
`orders.payment_reject`). The dashboard shows `awaitingVerification` (proofs not
yet checked). Revenue counts an order when it is **paid**, so a cash order counts
once the cash is collected.

### Products and photos

| Method | Path                     | Permission        | Notes                                                                                        |
| ------ | ------------------------ | ----------------- | -------------------------------------------------------------------------------------------- |
| GET    | `/products`              | `products.view`   | Filters `search` (name, slug, SKU), `status`, `categoryId`, `listed`, `deleted`, paging.     |
| POST   | `/products`              | `products.manage` | Always a draft. Leave `slug` out to make one from the name (`-2`, `-3` if taken).            |
| GET    | `/products/:id`          | `products.view`   | Photos, variants with stock per market, prices, detail cards.                                |
| PATCH  | `/products/:id`          | `products.manage` | `status: "active"` needs a price and an active variant (`409` otherwise).                    |
| DELETE | `/products/:id`          | `products.delete` | Soft delete: hidden from the shop, kept, can be restored.                                    |
| POST   | `/products/:id/restore`  | `products.delete` | Comes back as a draft.                                                                       |
| PUT    | `/products/:id/prices`   | `products.manage` | `{ PK?: { amount, compareAtAmount? } \| null, DE?: ... }`. `null` removes the price.         |
| POST   | `/products/:id/variants` | `products.manage` | `{ sku, colorName?, colorHex?, sizeLabel?, sort?, active?, stock?: { PK?, DE? } }`.          |
| PATCH  | `/variants/:id`          | `products.manage` | Variants are deactivated, never removed. The last active variant of a product on sale stays. |
| PUT    | `/products/:id/sections` | `products.manage` | `{ sections: [{ title, body }] }`, exactly these, in this order (at most 12).                |

A deleted product cannot be changed until restored (`409`). Stock is changed
under `/stock`, not here.

**Photos** (at most 10 per product):

| Method | Path                            | Permission        | Notes                                                                                                                                    |
| ------ | ------------------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/products/:id/images`          | `products.manage` | `multipart/form-data`, field `photo`, JPG / PNG / WebP up to **8 MB**. Re-encoded to WebP, at most **1600 px**, metadata removed. `201`. |
| PATCH  | `/products/:id/images/:imageId` | `products.manage` | `{ alt?, position? }`. `position` is where the picture is cropped from (CSS `object-position`, e.g. `center top`); `null` clears it.     |
| PUT    | `/products/:id/images/order`    | `products.manage` | `{ ids: [...] }`: every photo of the product, once each, in the new order. The first is the main photo.                                  |
| DELETE | `/products/:id/images/:imageId` | `products.manage` | Removes the photo and, if it was uploaded, its file.                                                                                     |

The file type is decided by what the image decoder finds, not by the file name
or type the browser sent. A new photo's description starts as the product name.
Each answer is the whole updated product. Uploaded photos are public at
`/api/v1/media/products/<name>.webp` (cached for a year; every upload gets a
new name), and that is the `src` the shop pages use. Photos that ship with the
site keep their `/images/...` paths.

### Categories, collections, home page

| Method         | Path                             | Permission                                                                                |
| -------------- | -------------------------------- | ----------------------------------------------------------------------------------------- |
| GET            | `/categories`, `/categories/:id` | `products.view` or `catalog.manage`                                                       |
| POST           | `/categories`                    | `catalog.manage`                                                                          |
| PATCH          | `/categories/:id`                | `catalog.manage`                                                                          |
| DELETE         | `/categories/:id`                | `catalog.manage` (`409` while products belong to it)                                      |
| POST           | `/categories/:id/subcategories`  | `catalog.manage`                                                                          |
| PATCH / DELETE | `/subcategories/:id`             | `catalog.manage` (`409` while products belong to it)                                      |
| PUT            | `/categories/:id/collections`    | `catalog.manage`: `{ collectionIds }`, the filter choices of the page, in order           |
| GET            | `/collections`                   | `products.view` or `catalog.manage`                                                       |
| POST           | `/collections`                   | `catalog.manage`                                                                          |
| PATCH / DELETE | `/collections/:id`               | `catalog.manage` (`409` while products are in it)                                         |
| GET            | `/home-sections`                 | `products.view` or `catalog.manage`                                                       |
| PUT            | `/home-sections/:section`        | `catalog.manage`: `{ productIds }`; sections `featured`, `new-arrivals`, `special-offers` |

### Stock

| Method | Path                         | Permission     | Notes                                                                                                                         |
| ------ | ---------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/stock`                     | `stock.view`   | Every variant in both markets. Filters `market`, `productId`, `search`, `lowOnly=true`, paging.                               |
| GET    | `/stock/movements`           | `stock.view`   | The ledger: sales, returns, adjustments with who and why. Filters `variantId`, `market`, `reason`, `from`, `to`, paging.      |
| POST   | `/stock/adjustments`         | `stock.adjust` | `{ variantId, market, delta }` or `{ variantId, market, setTo }`, optional `reason` (`adjustment` / `correction`) and `note`. |
| PATCH  | `/stock/low-stock-threshold` | `stock.adjust` | `{ variantId, market, lowStockThreshold }`.                                                                                   |

Stock can never go below what unpaid orders are holding (`409`). Two staff
members changing the same stock at once are handled safely (rows are locked
the same way the order code does it).

### Customers

| Method | Path                     | Permission         | Notes                                                                                             |
| ------ | ------------------------ | ------------------ | ------------------------------------------------------------------------------------------------- |
| GET    | `/customers`             | `customers.view`   | Filters `search` (email, name, phone), `status`, paging.                                          |
| GET    | `/customers/:id`         | `customers.view`   | Profile (never secrets), addresses, spend per currency, newest 100 orders.                        |
| POST   | `/customers/:id/block`   | `customers.manage` | `{ reason }`. Signs them out everywhere and refuses their logins. Orders, cart and wishlist stay. |
| POST   | `/customers/:id/unblock` | `customers.manage` | `{ note? }`.                                                                                      |

### Discounts

A discount is a **whole percent (1 to 90) off chosen products, in chosen markets (Pakistan, Germany or both), optionally between two dates**, with an on/off switch. The price the shop charges is worked out in ONE place, the database view `product_prices_effective`: the product pages, the cart, checkout and order placement all read it, so they cannot disagree. Nothing overwrites a product's own price.

- **Status** (computed): `off` (switched off), `scheduled` (starts later), `ended`, or `active`.
- **Best wins:** if a product is in two discounts, the bigger percent applies; they never add up.
- **Rounding:** the discounted price of one unit is rounded once to a whole paisa or cent (a discount that would not lower the price, such as 10% of 1 paisa, does not apply).
- **Old price:** while a discount applies, the struck-through price is the product's list price (it replaces an old price staff typed in); when it stops, the old price comes back.
- **Shop API:** a price has `amount` (what to pay now), `compareAtAmount` (struck through) and `discountPercent` (only while a discount applies). Cart lines also have `listAmount`.
- **Orders:** `order_items.unit_amount` stays the list price; each line stores its `discount_amount` and `discount_percent`. `orders.subtotal` is the list total, `orders.discount_total` is what was taken off, and `total = subtotal - discount_total + shipping`. Placed orders never change when a discount is edited or deleted. German VAT is worked out from the total after the discount.
- **Dates and the shop cache:** the shop pages refresh every 60 seconds and at once after staff save, so a date taking effect shows within about a minute.

| Method | Path                  | Permission         | Notes                                                                                                                         |
| ------ | --------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/discounts`          | `discounts.view`   | Newest first. Filters `status` (`active`, `scheduled`, `ended`, `off`), `search` (name), paging.                              |
| GET    | `/discounts/:id`      | `discounts.view`   | The discount and its `products`.                                                                                              |
| GET    | `/discounts/products` | `discounts.view`   | `?search=` up to 20 products to pick from (name, slug or SKU).                                                                |
| POST   | `/discounts`          | `discounts.manage` | `{ name, percent, markets, startsAt?, endsAt?, active?, productIds }`. `400` names the box (the end must be after the start). |
| PATCH  | `/discounts/:id`      | `discounts.manage` | Only the fields sent; `productIds` replaces the list; `active` is the on/off switch.                                          |
| DELETE | `/discounts/:id`      | `discounts.manage` | `204`. Orders already placed keep their prices.                                                                               |

### Contact Us messages

`POST /api/v1/contact` (the shop's contact form) now **saves** every message, then also emails the shop when `CONTACT_TO_EMAIL` is set (a failed notification email never fails the form). Staff read and answer the messages here. Answers are emailed to the visitor; their reply to that email goes to the shop's contact address (Settings), not into the admin.

| Method | Path                 | Permission      | Notes                                                                                                                                                                                                                              |
| ------ | -------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/contact`           | `contact.view`  | Newest first. Filters `status` (`new`, `replied`), `search` (name, email, text), paging. Each item has `replyCount`.                                                                                                               |
| GET    | `/contact/:id`       | `contact.view`  | `{ message }` with `replies` (text, who, when), oldest first.                                                                                                                                                                      |
| POST   | `/contact/:id/reply` | `contact.reply` | `{ message }` (up to 5000 characters). Emails the visitor first; if that fails the answer is `503` and nothing is saved. Then records it, sets the message to `replied`, and writes the audit log. More than one reply is allowed. |

### Reviews and the special offer row

Customers write reviews on the shop (see below); staff only moderate them.

| Method | Path                   | Permission                          | Notes                                                                                                                                                                        |
| ------ | ---------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/reviews`             | `reviews.view`                      | Newest first. Filters `status` (`pending`, `published`, `hidden`), `rating` (1 to 5), `productId`, `search`, paging.                                                         |
| GET    | `/reviews/products`    | `reviews.view`                      | The products that have reviews (`{ items: [{ id, name }] }`), for the product filter.                                                                                        |
| POST   | `/reviews/:id/publish` | `reviews.moderate`                  | Approves a **pending** review: it shows on the product page and counts in the stars (`409` if it is not pending).                                                            |
| DELETE | `/reviews/:id`         | `reviews.moderate`                  | Deletes the review for good, any status (`204`). The audit log keeps its text.                                                                                               |
| POST   | `/reviews/:id/hide`    | `reviews.moderate`                  | `{ reason }`. Works on a pending or published review: takes it off the shop and out of the product's rating (on a pending one it turns the review down). Nothing is deleted. |
| POST   | `/reviews/:id/restore` | `reviews.moderate`                  | Shows it again.                                                                                                                                                              |
| GET    | `/home-offer`          | `products.view` or `catalog.manage` | `{ offer: { endsAt, headline } }`.                                                                                                                                           |
| PUT    | `/home-offer`          | `catalog.manage`                    | `{ endsAt, headline }`: an ISO time (or `null` for no countdown) and an optional headline. A past time hides the row. `GET /home-sections` also carries the `offer`.         |

**Shop side (customers).** `GET /api/v1/products/:slug/reviews` (public; `page`, `pageSize` up to 50) answers the published reviews, the star `summary`, and `viewer` (`sign_in`, `needs_purchase`, `can_review` or `already_reviewed`). `POST /api/v1/products/:slug/reviews { rating, title?, body }` needs a signed-in customer **with a completed order containing the product**, once per product (`403` / `409` otherwise). `PATCH` and `DELETE /api/v1/reviews/:id` change or remove the customer's own. A new review is **pending**: only its author sees it (viewer `mine.status` is `pending`) until staff publish it, then it shows under "First name L.". When the author changes a published review it goes back to pending; a pending one stays pending; a hidden one cannot be changed. A product's `rating_avg` and `rating_count` are always worked out from its published reviews (the sample catalogue's invented ratings were removed). A deleted account's reviews stay as "Former customer". The "% off" of the offer row is worked out from the products' real price and old price, never typed in.

### Settings

| Method | Path        | Permission        | Notes                                                                                                              |
| ------ | ----------- | ----------------- | ------------------------------------------------------------------------------------------------------------------ |
| GET    | `/settings` | `settings.view`   | Shipping fee per market, German VAT rate, unpaid-order hold time, shop contact details.                            |
| PATCH  | `/settings` | `settings.manage` | Changes only what is sent. New orders use the new values at once; existing orders keep what they were placed with. |

`PATCH /settings` also takes `payments`: `{ manualHoldHours?, bank?, easypaisa?,
jazzcash? }`, where `bank` is `{ bankName, accountTitle, accountNumber }` and
the wallets are `{ accountTitle, number }`. A method that is left out stays as it
is; `null` removes it (it is then no longer offered at checkout).

These live in the database (not environment variables). The shop reads the
public part (contact details) at `GET /api/v1/settings/shop`, and the cart
reads shipping and VAT at `GET /api/v1/checkout/pricing?market=`.

### Staff and roles (super admin only)

| Method | Path                          | Notes                                                                                                                           |
| ------ | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/permissions`                | Every permission a role can allow, with descriptions, for the role form.                                                        |
| GET    | `/roles`, POST `/roles`       | `{ name, description?, permissions[] }`.                                                                                        |
| PATCH  | `/roles/:id`                  | Takes effect at once for everyone with the role.                                                                                |
| DELETE | `/roles/:id`                  | `409` while anyone still has the role.                                                                                          |
| GET    | `/staff?search=&status=`      | Everyone with their roles.                                                                                                      |
| POST   | `/staff`                      | `{ email, firstName, lastName, roleIds?, isSuperAdmin? }`. Emails an invite link. `inviteEmailSent: false` if the email failed. |
| GET    | `/staff/:id`                  |                                                                                                                                 |
| PATCH  | `/staff/:id`                  | Names, roles, enable / disable, super admin flag. Disabling signs the person out at once.                                       |
| POST   | `/staff/:id/resend-invite`    | For someone who has not accepted yet.                                                                                           |
| POST   | `/staff/:id/reset-two-factor` | For a lost phone: removes the authenticator and recovery codes and signs the person out.                                        |

The **last active super admin** can never be disabled or demoted, and nobody
can disable or demote themselves.

### Audit log (super admin only)

`GET /audit?staffId=&entityType=&entityId=&action=&from=&to=&page=&pageSize=`

Newest first. Each row: `id`, `at`, `staffId`, `staffEmail` (kept even if the
staff account changes), `action` (e.g. `orders.status_change`,
`products.image_add`, `stock.adjust`), `entityType`, `entityId`, `before`,
`after`, `requestId`. Rows never contain password hashes or authenticator
secrets, and cannot be changed or deleted (the database refuses it, also for
the website's own login). The sign-in IP address is stored only for sign-in
events and is not returned by this endpoint.

## Environment

| Variable                   | Purpose                                                                                                                       |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `STAFF_2FA_ENCRYPTION_KEY` | **Required for the admin.** 32 random bytes as base64; encrypts authenticator secrets. If it is lost, staff set up 2FA again. |
| `SMTP_*`, `MAIL_FROM`      | Invites, password resets and customer order emails. Without `SMTP_HOST`, development prints emails in the server log.         |
| `UPLOADS_DIR`              | Where uploaded files (product photos, customer avatars) are kept. Required in production, an absolute path.                   |

Generate the key with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```
