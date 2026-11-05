-- Paying without a gateway: cash on delivery, bank transfer, Easypaisa and JazzCash. The customer pays
-- outside the shop; for transfers they send a transaction ID and/or a screenshot, and staff check it.

-- New ways to pay, and a payment status for "the customer says they paid, staff have not checked yet".
ALTER TABLE orders
  DROP CONSTRAINT orders_payment_method_valid,
  ADD CONSTRAINT orders_payment_method_valid CHECK (
    payment_method IN ('card', 'cod', 'bank_transfer', 'easypaisa', 'jazzcash')
  ),
  DROP CONSTRAINT orders_payment_status_valid,
  ADD CONSTRAINT orders_payment_status_valid CHECK (
    payment_status IN ('pending', 'awaiting_verification', 'paid', 'failed', 'refunded', 'partially_refunded')
  );

-- What the customer sent as proof of a transfer. The screenshot is a private file in storage
-- (key "payment-proofs/<random>.webp"): it is only ever served to staff who may verify payments.
CREATE TABLE payment_proofs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        uuid NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  -- The bank's / wallet's transaction ID (TID) as the customer typed it. At least this or a screenshot.
  transaction_ref text,
  file_key        text,
  status          text NOT NULL DEFAULT 'pending',
  submitted_at    timestamptz NOT NULL DEFAULT now(),
  reviewed_at     timestamptz,
  reviewed_by     uuid REFERENCES staff (id) ON DELETE SET NULL,
  -- Why a proof was rejected (shown to the customer) or a note on approval.
  review_note     text,

  CONSTRAINT payment_proofs_status_valid CHECK (status IN ('pending', 'approved', 'rejected')),
  CONSTRAINT payment_proofs_has_proof CHECK (transaction_ref IS NOT NULL OR file_key IS NOT NULL),
  CONSTRAINT payment_proofs_ref_length CHECK (transaction_ref IS NULL OR length(btrim(transaction_ref)) BETWEEN 4 AND 60),
  CONSTRAINT payment_proofs_note_length CHECK (review_note IS NULL OR length(review_note) <= 500),
  CONSTRAINT payment_proofs_reviewed_together CHECK ((status = 'pending') = (reviewed_at IS NULL))
);

CREATE INDEX payment_proofs_order_idx ON payment_proofs (order_id, submitted_at);
-- The same transaction ID cannot be used to pay two orders.
CREATE INDEX payment_proofs_ref_idx ON payment_proofs (lower(transaction_ref)) WHERE transaction_ref IS NOT NULL;
-- Staff look for proofs that still wait for them.
CREATE INDEX payment_proofs_pending_idx ON payment_proofs (submitted_at) WHERE status = 'pending';

-- Where customers send the money, and how long stock is held for a transfer (staff change these in the admin).
-- payment_details looks like:
--   { "bank": { "bankName", "accountTitle", "accountNumber" },
--     "easypaisa": { "accountTitle", "number" }, "jazzcash": { "accountTitle", "number" } }
-- A method that is missing is not offered at checkout. Cash on delivery needs no details.
ALTER TABLE shop_settings
  ADD COLUMN manual_hold_hours integer NOT NULL DEFAULT 48,
  ADD COLUMN payment_details   jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD CONSTRAINT shop_settings_manual_hold_valid CHECK (manual_hold_hours BETWEEN 1 AND 336),
  ADD CONSTRAINT shop_settings_payment_details_is_object CHECK (jsonb_typeof(payment_details) = 'object');
