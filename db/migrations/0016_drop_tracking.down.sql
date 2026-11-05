-- Brings the columns back empty; the values dropped by the up migration are not restored.
ALTER TABLE orders
  ADD COLUMN carrier         text,
  ADD COLUMN tracking_number text,
  ADD CONSTRAINT orders_carrier_length CHECK (carrier IS NULL OR length(btrim(carrier)) BETWEEN 1 AND 80),
  ADD CONSTRAINT orders_tracking_length CHECK (tracking_number IS NULL OR length(btrim(tracking_number)) BETWEEN 1 AND 120),
  ADD CONSTRAINT orders_delivery_complete CHECK ((carrier IS NULL) = (tracking_number IS NULL));
