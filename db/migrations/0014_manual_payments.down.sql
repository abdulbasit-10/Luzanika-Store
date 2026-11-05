ALTER TABLE shop_settings
  DROP CONSTRAINT shop_settings_payment_details_is_object,
  DROP CONSTRAINT shop_settings_manual_hold_valid,
  DROP COLUMN payment_details,
  DROP COLUMN manual_hold_hours;

DROP TABLE payment_proofs;

-- Orders placed with the new methods cannot exist under the old rules.
DELETE FROM orders WHERE payment_method <> 'card';
UPDATE orders SET payment_status = 'pending' WHERE payment_status = 'awaiting_verification';
ALTER TABLE orders
  DROP CONSTRAINT orders_payment_status_valid,
  ADD CONSTRAINT orders_payment_status_valid CHECK (
    payment_status IN ('pending', 'paid', 'failed', 'refunded', 'partially_refunded')
  ),
  DROP CONSTRAINT orders_payment_method_valid,
  ADD CONSTRAINT orders_payment_method_valid CHECK (payment_method IN ('card'));
