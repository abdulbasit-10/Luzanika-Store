-- Orders no longer carry a carrier or a tracking number. "In delivery" is now just a status.
-- Any carrier / tracking values already saved on orders are discarded by this migration.

ALTER TABLE orders
  DROP CONSTRAINT orders_delivery_complete,
  DROP CONSTRAINT orders_tracking_length,
  DROP CONSTRAINT orders_carrier_length,
  DROP COLUMN tracking_number,
  DROP COLUMN carrier;
