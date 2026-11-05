-- Discounts: a named percentage off for chosen products in chosen markets, optionally between two dates.
-- The price the shop charges is worked out in ONE place, the view product_prices_effective, so the product
-- pages, the cart and checkout can never disagree. Nothing overwrites a product's real price.

CREATE TABLE discounts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  -- Whole percent off the list price. Capped at 90 so a price never reaches zero.
  percent    smallint NOT NULL,
  -- Where it applies: 'PK', 'DE' or both.
  markets    text[] NOT NULL,
  -- No start means "already started", no end means "until switched off".
  starts_at  timestamptz,
  ends_at    timestamptz,
  -- The manual switch: an inactive discount never applies, whatever the dates.
  active     boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES staff (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES staff (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT discounts_name_length CHECK (length(btrim(name)) BETWEEN 1 AND 80),
  CONSTRAINT discounts_percent_valid CHECK (percent BETWEEN 1 AND 90),
  CONSTRAINT discounts_markets_valid CHECK (
    cardinality(markets) BETWEEN 1 AND 2 AND markets <@ ARRAY['PK', 'DE']::text[]
  ),
  CONSTRAINT discounts_dates_valid CHECK (starts_at IS NULL OR ends_at IS NULL OR ends_at > starts_at)
);

CREATE TRIGGER discounts_set_updated_at
  BEFORE UPDATE ON discounts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE discount_products (
  discount_id uuid NOT NULL REFERENCES discounts (id) ON DELETE CASCADE,
  product_id  uuid NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  PRIMARY KEY (discount_id, product_id)
);

CREATE INDEX discount_products_product_idx ON discount_products (product_id);

-- The price a product is sold at right now, per market.
--   amount             what the customer pays for one unit (the list price less the best active discount)
--   list_amount        the product's own price, before any discount
--   discount_percent   the percent taken off, or NULL when no discount applies
--   compare_at_amount  the old price shown struck through: the list price while a discount applies,
--                      otherwise the old price staff typed in (if any)
-- If two discounts cover the same product the bigger one wins; they never add up. The discounted
-- price is rounded once, to a whole paisa or cent, per unit.
CREATE VIEW product_prices_effective AS
SELECT pr.product_id,
       pr.market,
       pr.currency,
       COALESCE(d.sale, pr.amount) AS amount,
       pr.amount AS list_amount,
       d.percent AS discount_percent,
       CASE WHEN d.sale IS NOT NULL THEN pr.amount ELSE pr.compare_at_amount END AS compare_at_amount
FROM product_prices pr
LEFT JOIN LATERAL (
  SELECT x.percent, round(pr.amount * (100 - x.percent) / 100.0)::bigint AS sale
  FROM (
    SELECT max(dc.percent)::smallint AS percent
    FROM discount_products dp
    JOIN discounts dc ON dc.id = dp.discount_id
    WHERE dp.product_id = pr.product_id
      AND dc.active
      AND pr.market = ANY (dc.markets)
      AND (dc.starts_at IS NULL OR dc.starts_at <= now())
      AND (dc.ends_at IS NULL OR dc.ends_at > now())
  ) x
  WHERE x.percent IS NOT NULL
) d ON d.sale < pr.amount;

-- What an order line was discounted by, kept as it was when the order was placed. unit_amount stays the
-- list price, so the order's subtotal is the list total and orders.discount_total is what was taken off.
ALTER TABLE order_items
  ADD COLUMN discount_amount  bigint NOT NULL DEFAULT 0,
  ADD COLUMN discount_percent smallint,
  ADD CONSTRAINT order_items_discount_valid CHECK (discount_amount >= 0 AND discount_amount <= line_total);
