DROP INDEX stock_movements_staff_idx;
ALTER TABLE stock_movements DROP COLUMN staff_id;
DROP TABLE refund_items;
DROP TABLE refunds;
ALTER TABLE orders
  DROP CONSTRAINT orders_delivery_complete,
  DROP CONSTRAINT orders_tracking_length,
  DROP CONSTRAINT orders_carrier_length,
  DROP COLUMN completed_at,
  DROP COLUMN shipped_at,
  DROP COLUMN tracking_number,
  DROP COLUMN carrier;
