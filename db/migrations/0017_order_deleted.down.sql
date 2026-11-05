ALTER TABLE orders
  DROP CONSTRAINT orders_deleted_only_when_cancelled,
  DROP COLUMN deleted_at;
