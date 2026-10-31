-- A signed-in browser. The cookie holds a random token; only its SHA-256 hash is
-- stored here, so a stolen database copy cannot be used to impersonate anyone.
-- A row can be revoked (logout, "log out everywhere", password change) at any time.
CREATE TABLE customer_sessions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id  uuid NOT NULL REFERENCES customers (id) ON DELETE CASCADE,

  token_hash   text NOT NULL,
  ip           inet,
  user_agent   text,

  created_at   timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NOT NULL,
  revoked_at   timestamptz,

  CONSTRAINT customer_sessions_token_hash_unique UNIQUE (token_hash),
  CONSTRAINT customer_sessions_token_hash_format CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT customer_sessions_user_agent_length CHECK (user_agent IS NULL OR length(user_agent) <= 512),
  CONSTRAINT customer_sessions_expiry_after_creation CHECK (expires_at > created_at)
);

-- "Show / revoke all my sessions", and removing a customer's sessions.
CREATE INDEX customer_sessions_customer_idx ON customer_sessions (customer_id);
-- Periodic cleanup of expired sessions.
CREATE INDEX customer_sessions_expires_at_idx ON customer_sessions (expires_at);
