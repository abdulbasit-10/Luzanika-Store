# Full test pass, 4 November 2026

What was tested, what was found, and what is still open. Tested on the dev
database with a production build of the shop and the admin, plus throwaway
staff accounts, customers, orders and products (the test staff are disabled and
the test products hidden; test orders, customers and stock history remain).

## Automated suites

| Suite                                | Result                |
| ------------------------------------ | --------------------- |
| Unit                                 | 446 passed            |
| Integration (own throwaway database) | 546 passed (22 files) |
| Lint, type-check, production build   | clean                 |

## Scenario tests (scripts, against the real API)

All passed unless listed under "Findings".

- **Admin permissions: 156 checks.** Every admin endpoint for four roles (super admin, packer, catalogue viewer, no role) and for a signed-out visitor: reads, writes, wrong website origin, password-only sign-in (no authenticator), unknown email gives the same answer as a wrong password, role changes take effect on the next request, disabling a person ends their session at once, nobody can disable or demote themselves.
- **Shop and accounts.** Sign-up rules, duplicate email (also in capitals), unknown fields refused, sessions, forgot password, a customer cannot read or change another customer's address or order, a staff login does not sign anyone in on the shop. Cart limits (0, 100, negative, unknown product, unknown market). Wishlist. Profile, addresses, contact form.
- **Orders.** Last unit sold to two customers at the same moment: exactly one order, the other gets 409 `cart_changed`, the unit returns when staff cancel, a repeated request with the same Idempotency-Key makes one order. A total the shopper did not see is refused. Easypaisa: proof with nothing or a bad ID refused, fake image refused, another customer cannot post a proof, admin sees the private screenshot (not cached, not for the customer or a packer), reject needs a reason, resubmit, confirm, confirming twice refused, stock held then sold. Shipping needs a carrier and tracking, no going back from completed, a paid order cannot be cancelled, refunds (0, above the paid amount, no reason refused; partial with restock; the rest ends the order as refunded; stock returns). Cash on delivery: straight to processing, cash confirmed later, a fake order cancelled and its goods restocked. Germany: card, free shipping, 19% VAT included (142,10 on 890,00), simulated payment failure then success.
- **Dashboard** numbers equal the sums over the orders list for both markets, PKR and EUR never added.
- **Security.** Cookies HttpOnly and SameSite, framing blocked, no-store on admin answers, 413 for a 200 KB body, non-JSON body refused, path traversal on photos blocked, SQL-looking and script-looking input harmless, HTML in a product name stored as text, no secrets in the audit log, sign-in rate limit (429 after 20 wrong tries).
- **Real browser, production build.** Sign-up (empty form, mismatched passwords), product page, cart, checkout (empty form, then a real cash on delivery order, LZ-PK-000017), then in the admin: Packer sees only Orders, every other screen says the role does not include it, ships with carrier and tracking; super admin confirms the cash and completes. Wrong authenticator code message. Log out, then Back, shows the sign-in page. Phone-size layouts of the shop and the admin have no sideways scroll.

## Findings

### Must fix before launch

1. **Germany cannot buy in production.** With no card provider, placing a card order answers 500 and the shopper sees "Something went wrong." (`PAYMENT_PROVIDER` must be `stripe`; the simulated provider is refused in production, which is right.) Until Stripe is built, either hide Germany checkout with a clear message or answer with a friendly 503.
2. **No emails are sent without a mail server.** Confirmed: "email not sent: no mail server is configured". The order still ships, but the customer gets nothing (order status, invites, password resets, contact form). Needs the client's SMTP details.
3. **Placeholder shop details on every page.** Footer and contact show `Luzanika@example.com`, "Pak & Germany" and a fake phone `(480) 555-0103`; social links go to the generic home pages of LinkedIn, X and Facebook. Fix in Settings.
4. **Fake or invented content shown to customers.** The home page "Special Offers - 50%" has a countdown that always counts to midnight (a mock, see `mock-offer-countdown.tsx`) and the "- 50%" is typed into the page. Product pages show "23 Reviews" and star ratings that come from the sample catalogue (there is no review system). In the catalogue, all 42 products have the same number in PKR and EUR (for example PKR 890 and EUR 890) and many names repeat (the same shirt three times).
5. **Germany legal pages.** No Impressum (`/impressum` does not exist), and no "incl. VAT, plus shipping" line next to the price on product pages (the checkout does show the VAT). Worth a lawyer's look before selling in Germany.

### Decide

6. **The server accepts a card order in Pakistan**, although the shop only offers cash and transfers there (`allowedInMarket` allows cards everywhere; a unit test asserts it). Such an order holds stock for 30 minutes and can never be paid. Suggest allowing only `methodsForMarket(market)`.
7. **A customer cannot cancel a cash on delivery order** once it is processing ("This order can no longer be cancelled."); only staff can. Fine if intended.
8. **A blocked customer is told "Email or password is incorrect."** Good for privacy, but support will get confused calls.
9. **Forgot password for an unknown email answers 404 "not registered"** (the admin one answers 204 for everyone). Deliberate in the code, but it tells anyone which emails have accounts.
10. **Rate limits live in server memory.** They reset on restart and are per server, so behind more than one server they are weaker than they look.

### Known and still to build

11. The customer cannot see the tracking number (only in the email, which needs item 2).
12. The shop downloads the whole catalogue and filters in the browser (`GET /products` ignores `pageSize`). Fine at 42 products; it will get heavy with a big catalogue.
13. Unknown addresses answer 200 the very first time and 404 afterwards (they all carry `noindex`, so search engines skip them).
14. The cart header says "Complimentary international express packaging included" while shipping is charged (copy).
15. The admin asks the server who is signed in every 3 seconds on every open tab.

### Fixed during this pass

- A person whose role has no dashboard (such as a packer) landed on a dead-end "Your role does not include the dashboard numbers." page after signing in. They now land on the first screen they can use.
