-- Each customer's cart and wishlist, kept on the server so they follow the customer to any device.
-- The cart stores only WHICH variant and HOW MANY. Prices and stock are always read from the
-- catalogue when the cart is shown, so a price change or a sell-out is never hidden by a stale copy.

CREATE TABLE cart_items (
  customer_id uuid NOT NULL REFERENCES customers (id) ON DELETE CASCADE,
  variant_id  uuid NOT NULL REFERENCES product_variants (id) ON DELETE CASCADE,
  quantity    integer NOT NULL,
  -- Only ticked lines count towards the total and checkout.
  selected    boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  -- One line per variant: adding it again raises the quantity instead of making a second line.
  PRIMARY KEY (customer_id, variant_id),

  CONSTRAINT cart_items_quantity_valid CHECK (quantity BETWEEN 1 AND 99)
);

CREATE TRIGGER cart_items_set_updated_at
  BEFORE UPDATE ON cart_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX cart_items_variant_idx ON cart_items (variant_id);

CREATE TABLE wishlist_items (
  customer_id uuid NOT NULL REFERENCES customers (id) ON DELETE CASCADE,
  product_id  uuid NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (customer_id, product_id)
);

-- A customer's list, newest first.
CREATE INDEX wishlist_items_customer_idx ON wishlist_items (customer_id, created_at DESC);
CREATE INDEX wishlist_items_product_idx ON wishlist_items (product_id);
