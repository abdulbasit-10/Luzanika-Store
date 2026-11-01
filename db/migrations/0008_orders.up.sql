-- Orders, what was bought (a snapshot), the order's history and its payments.
-- An order keeps its own copy of the prices, names and addresses it was placed with, so later
-- price changes, edits or deleted products and accounts never change an order that already exists.
-- Money is bigint minor units (paisa / cents).

-- Gap-free order numbers per market (LZ-PK-000123). The row is locked while the number is taken.
CREATE TABLE order_counters (
  market      text PRIMARY KEY,
  last_number bigint NOT NULL DEFAULT 0,

  CONSTRAINT order_counters_market_valid CHECK (market IN ('PK', 'DE')),
  CONSTRAINT order_counters_number_valid CHECK (last_number >= 0)
);

INSERT INTO order_counters (market) VALUES ('PK'), ('DE');

CREATE TABLE orders (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number          text NOT NULL UNIQUE,
  market          text NOT NULL,
  currency        text NOT NULL,
  -- Kept (not deleted) when the account is deleted: orders are business records.
  customer_id     uuid REFERENCES customers (id) ON DELETE SET NULL,
  -- Sent by the website once per checkout attempt, so a double click or a retry never makes two orders.
  idempotency_key text,

  email           text NOT NULL,
  phone           text NOT NULL,

  status          text NOT NULL DEFAULT 'waiting_payment',
  payment_status  text NOT NULL DEFAULT 'pending',
  payment_method  text NOT NULL,
  -- reserved: the stock is held for this unpaid order; committed: it was sold; released: it was given back.
  stock_state     text NOT NULL DEFAULT 'reserved',
  -- An unpaid order gives its stock back after this moment.
  reservation_expires_at timestamptz,

  subtotal        bigint NOT NULL,
  discount_total  bigint NOT NULL DEFAULT 0,
  shipping_total  bigint NOT NULL DEFAULT 0,
  tax_total       bigint NOT NULL DEFAULT 0,
  -- NULL: tax is not set up yet (nothing is added). FALSE: tax is added on top. TRUE: already inside the prices.
  tax_included    boolean,
  total           bigint NOT NULL,

  ship_name       text NOT NULL,
  ship_company    text,
  ship_country    text NOT NULL,
  ship_city       text NOT NULL,
  ship_address    text NOT NULL,
  ship_zip        text NOT NULL,
  -- All NULL when billing is the same as shipping.
  bill_country    text,
  bill_city       text,
  bill_address    text,
  bill_zip        text,

  accepted_terms_at timestamptz NOT NULL,
  placed_at       timestamptz NOT NULL DEFAULT now(),
  paid_at         timestamptz,
  cancelled_at    timestamptz,
  cancel_reason   text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT orders_market_currency CHECK (
    (market = 'PK' AND currency = 'PKR') OR (market = 'DE' AND currency = 'EUR')
  ),
  CONSTRAINT orders_status_valid CHECK (
    status IN ('waiting_payment', 'processing', 'in_delivery', 'completed', 'cancelled', 'refunded')
  ),
  CONSTRAINT orders_payment_status_valid CHECK (
    payment_status IN ('pending', 'paid', 'failed', 'refunded', 'partially_refunded')
  ),
  CONSTRAINT orders_payment_method_valid CHECK (payment_method IN ('card')),
  CONSTRAINT orders_stock_state_valid CHECK (stock_state IN ('reserved', 'committed', 'released')),
  CONSTRAINT orders_amounts_valid CHECK (
    subtotal >= 0 AND discount_total >= 0 AND shipping_total >= 0 AND tax_total >= 0 AND total >= 0
  ),
  CONSTRAINT orders_total_adds_up CHECK (
    total = subtotal - discount_total + shipping_total + CASE WHEN tax_included IS FALSE THEN tax_total ELSE 0 END
  ),
  CONSTRAINT orders_billing_complete CHECK (
    (bill_country IS NULL AND bill_city IS NULL AND bill_address IS NULL AND bill_zip IS NULL)
    OR (bill_country IS NOT NULL AND bill_city IS NOT NULL AND bill_address IS NOT NULL AND bill_zip IS NOT NULL)
  ),
  -- An order that is waiting for payment holds stock; a cancelled one never does; one being processed has sold it.
  CONSTRAINT orders_stock_matches_status CHECK (
    (status = 'waiting_payment' AND stock_state = 'reserved')
    OR (status IN ('processing', 'in_delivery', 'completed') AND stock_state = 'committed')
    OR (status = 'cancelled' AND stock_state = 'released')
    OR (status = 'refunded')
  ),
  CONSTRAINT orders_cancel_has_time CHECK (status <> 'cancelled' OR cancelled_at IS NOT NULL)
);

CREATE TRIGGER orders_set_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE UNIQUE INDEX orders_idempotency_unique
  ON orders (customer_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX orders_customer_idx ON orders (customer_id, placed_at DESC);
CREATE INDEX orders_market_status_idx ON orders (market, status, placed_at DESC);
-- Finding unpaid orders whose time ran out.
CREATE INDEX orders_reservation_expiry_idx
  ON orders (reservation_expires_at) WHERE stock_state = 'reserved';

CREATE TABLE order_items (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id       uuid NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  -- Kept as plain ids when a product is removed later; the name and price below are the record.
  product_id     uuid REFERENCES products (id) ON DELETE SET NULL,
  variant_id     uuid REFERENCES product_variants (id) ON DELETE SET NULL,
  product_slug   text NOT NULL,
  name           text NOT NULL,
  sku            text NOT NULL,
  color          text,
  size           text,
  image_src      text,
  image_alt      text,
  image_position text,
  -- The order the lines had in the cart, so an order always lists them the same way.
  position       integer NOT NULL DEFAULT 0,
  quantity       integer NOT NULL,
  unit_amount    bigint NOT NULL,
  line_total     bigint NOT NULL,

  CONSTRAINT order_items_quantity_valid CHECK (quantity BETWEEN 1 AND 99),
  CONSTRAINT order_items_amount_valid CHECK (unit_amount >= 0),
  CONSTRAINT order_items_line_adds_up CHECK (line_total = unit_amount * quantity)
);

CREATE INDEX order_items_order_idx ON order_items (order_id);
CREATE INDEX order_items_variant_idx ON order_items (variant_id);

-- Every change of status, who made it and why. Never edited or deleted.
CREATE TABLE order_status_history (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id    uuid NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  from_status text,
  to_status   text NOT NULL,
  actor_type  text NOT NULL,
  actor_id    uuid,
  note        text,
  at          timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT order_history_actor_valid CHECK (actor_type IN ('customer', 'system', 'payment', 'staff'))
);

CREATE INDEX order_status_history_order_idx ON order_status_history (order_id, at);

-- One row per attempt to collect the money, whichever provider handled it.
CREATE TABLE payments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     uuid NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  provider     text NOT NULL,
  -- The provider's own id for this payment (e.g. a Stripe PaymentIntent id).
  provider_ref text,
  method       text NOT NULL,
  amount       bigint NOT NULL,
  currency     text NOT NULL,
  status       text NOT NULL DEFAULT 'pending',
  failure_code text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT payments_status_valid CHECK (
    status IN ('requires_action', 'pending', 'succeeded', 'failed', 'cancelled')
  ),
  CONSTRAINT payments_amount_valid CHECK (amount >= 0),
  CONSTRAINT payments_currency_valid CHECK (currency IN ('PKR', 'EUR'))
);

CREATE TRIGGER payments_set_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE UNIQUE INDEX payments_provider_ref_unique
  ON payments (provider, provider_ref) WHERE provider_ref IS NOT NULL;
CREATE INDEX payments_order_idx ON payments (order_id);

-- Stock changes made for an order can now be traced back to it.
ALTER TABLE stock_movements
  ADD COLUMN order_id uuid REFERENCES orders (id) ON DELETE SET NULL;
CREATE INDEX stock_movements_order_idx ON stock_movements (order_id) WHERE order_id IS NOT NULL;
