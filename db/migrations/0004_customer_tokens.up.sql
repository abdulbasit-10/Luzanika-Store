-- One-time links sent by email (password reset now; email verification later).
-- Only the SHA-256 hash of the token is stored, so a copy of the database cannot be used
-- to reset anyone's password. A token works once and expires.
CREATE TABLE customer_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers (id) ON DELETE CASCADE,

  type        text NOT NULL,
  token_hash  text NOT NULL,

  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz,

  CONSTRAINT customer_tokens_token_hash_unique UNIQUE (token_hash),
  CONSTRAINT customer_tokens_token_hash_format CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT customer_tokens_type_allowed CHECK (type IN ('reset_password', 'verify_email')),
  CONSTRAINT customer_tokens_expiry_after_creation CHECK (expires_at > created_at)
);

-- Replacing a customer's older links of the same kind when a new one is requested.
CREATE INDEX customer_tokens_customer_type_idx ON customer_tokens (customer_id, type);
-- Periodic cleanup of expired links.
CREATE INDEX customer_tokens_expires_at_idx ON customer_tokens (expires_at);

-- The first migration's comment said Argon2id; the project uses bcrypt.
COMMENT ON COLUMN customers.password_hash IS 'bcrypt hash only. The password itself is never stored.';
