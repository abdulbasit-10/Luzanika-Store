-- What staff need to run orders: delivery details, when an order shipped or was completed,
-- refund records, and who made each stock change.

ALTER TABLE orders
  ADD COLUMN carrier         text,
  ADD COLUMN tracking_number text,
  ADD COLUMN shipped_at      timestamptz,
  ADD COLUMN completed_at    timestamptz,
  ADD CONSTRAINT orders_carrier_length CHECK (carrier IS NULL OR length(btrim(carrier)) BETWEEN 1 AND 80),
  ADD CONSTRAINT orders_tracking_length CHECK (tracking_number IS NULL OR length(btrim(tracking_number)) BETWEEN 1 AND 120),
  -- Both delivery fields are given together or not at all.
  ADD CONSTRAINT orders_delivery_complete CHECK ((carrier IS NULL) = (tracking_number IS NULL));

-- Money given back for an order. No money moves yet (there is no payment provider): this is the
-- record, and it decides the order's refund status. Amounts are minor units, like everything else.
CREATE TABLE refunds (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   uuid NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  staff_id   uuid REFERENCES staff (id),
  amount     bigint NOT NULL,
  currency   text NOT NULL,
  reason     text NOT NULL,
  -- Whether the returned items were put back into stock.
  restock    boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT refunds_amount_valid CHECK (amount > 0),
  CONSTRAINT refunds_currency_valid CHECK (currency IN ('PKR', 'EUR')),
  CONSTRAINT refunds_reason_length CHECK (length(btrim(reason)) BETWEEN 1 AND 500)
);

CREATE INDEX refunds_order_idx ON refunds (order_id, created_at);

-- Which items (and how many) came back with a refund. Only filled when the refund restocked them.
CREATE TABLE refund_items (
  refund_id     uuid NOT NULL REFERENCES refunds (id) ON DELETE CASCADE,
  order_item_id uuid NOT NULL REFERENCES order_items (id) ON DELETE CASCADE,
  quantity      integer NOT NULL,
  PRIMARY KEY (refund_id, order_item_id),

  CONSTRAINT refund_items_quantity_valid CHECK (quantity BETWEEN 1 AND 99)
);

CREATE INDEX refund_items_order_item_idx ON refund_items (order_item_id);

-- Stock changes made by a person in the admin can be traced to them.
ALTER TABLE stock_movements
  ADD COLUMN staff_id uuid REFERENCES staff (id);
CREATE INDEX stock_movements_staff_idx ON stock_movements (staff_id) WHERE staff_id IS NOT NULL;
