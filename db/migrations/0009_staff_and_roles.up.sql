-- Staff who run the shop through the admin. They are NOT customers: separate accounts,
-- separate sessions, separate login. Customers and staff can never be mixed up.

CREATE TABLE staff (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email             citext NOT NULL,
  first_name        text NOT NULL,
  last_name         text NOT NULL,
  -- bcrypt hash. NULL until the person accepts their invite and chooses a password.
  password_hash     text,
  -- invited: waiting to set a password. active: can sign in. disabled: cannot sign in, kept for the audit trail.
  status            text NOT NULL DEFAULT 'invited',
  -- A super admin can do everything and is the only one who manages staff, roles and reads the audit log.
  is_super_admin    boolean NOT NULL DEFAULT false,
  -- Authenticator-app secret, encrypted (AES-256-GCM) with a key that is not in the database.
  -- Present but with totp_enabled_at empty means "set up started, first code not confirmed yet".
  totp_secret_enc   text,
  totp_enabled_at   timestamptz,
  -- The 30-second step of the last accepted code, so one code cannot be used twice.
  totp_last_step    bigint,
  last_login_at     timestamptz,
  invited_by        uuid REFERENCES staff (id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT staff_email_unique UNIQUE (email),
  CONSTRAINT staff_email_format CHECK (
    email = btrim(email::text)::citext
    AND length(email::text) BETWEEN 3 AND 254
    AND position('@' IN email::text) > 1
  ),
  CONSTRAINT staff_first_name_length CHECK (length(btrim(first_name)) BETWEEN 1 AND 50),
  CONSTRAINT staff_last_name_length CHECK (length(btrim(last_name)) BETWEEN 1 AND 50),
  CONSTRAINT staff_status_allowed CHECK (status IN ('invited', 'active', 'disabled')),
  CONSTRAINT staff_active_has_password CHECK (status <> 'active' OR password_hash IS NOT NULL),
  CONSTRAINT staff_totp_enabled_has_secret CHECK (totp_enabled_at IS NULL OR totp_secret_enc IS NOT NULL)
);

CREATE TRIGGER staff_set_updated_at
  BEFORE UPDATE ON staff
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- A signed-in browser. As for customers, only the SHA-256 hash of the cookie token is stored.
-- A session starts "pending" (password accepted, mfa_verified_at empty) and becomes a real
-- session only after the authenticator code is accepted.
CREATE TABLE staff_sessions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id        uuid NOT NULL REFERENCES staff (id) ON DELETE CASCADE,
  token_hash      text NOT NULL,
  ip              inet,
  user_agent      text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  last_used_at    timestamptz NOT NULL DEFAULT now(),
  expires_at      timestamptz NOT NULL,
  mfa_verified_at timestamptz,
  revoked_at      timestamptz,

  CONSTRAINT staff_sessions_token_hash_unique UNIQUE (token_hash),
  CONSTRAINT staff_sessions_token_hash_format CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT staff_sessions_user_agent_length CHECK (user_agent IS NULL OR length(user_agent) <= 512),
  CONSTRAINT staff_sessions_expiry_after_creation CHECK (expires_at > created_at)
);

CREATE INDEX staff_sessions_staff_idx ON staff_sessions (staff_id);
CREATE INDEX staff_sessions_expires_at_idx ON staff_sessions (expires_at);

-- One-time links sent by email: the invite and a password reset. Only the hash is stored.
CREATE TABLE staff_tokens (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id   uuid NOT NULL REFERENCES staff (id) ON DELETE CASCADE,
  type       text NOT NULL,
  token_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  used_at    timestamptz,

  CONSTRAINT staff_tokens_token_hash_unique UNIQUE (token_hash),
  CONSTRAINT staff_tokens_token_hash_format CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT staff_tokens_type_allowed CHECK (type IN ('invite', 'reset_password')),
  CONSTRAINT staff_tokens_expiry_after_creation CHECK (expires_at > created_at)
);

CREATE INDEX staff_tokens_staff_type_idx ON staff_tokens (staff_id, type);
CREATE INDEX staff_tokens_expires_at_idx ON staff_tokens (expires_at);

-- Single-use codes for a lost phone. Only hashes are stored.
CREATE TABLE staff_recovery_codes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id   uuid NOT NULL REFERENCES staff (id) ON DELETE CASCADE,
  code_hash  text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  used_at    timestamptz,

  CONSTRAINT staff_recovery_codes_hash_format CHECK (code_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT staff_recovery_codes_hash_unique UNIQUE (code_hash)
);

CREATE INDEX staff_recovery_codes_staff_idx ON staff_recovery_codes (staff_id);

-- Roles are made by the super admin: a name and a list of permissions. The list of valid
-- permission names lives in the application code, which checks it when a role is saved.
CREATE TABLE roles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        citext NOT NULL,
  description text NOT NULL DEFAULT '',
  permissions text[] NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT roles_name_unique UNIQUE (name),
  CONSTRAINT roles_name_length CHECK (length(btrim(name::text)) BETWEEN 1 AND 60),
  CONSTRAINT roles_description_length CHECK (length(description) <= 300)
);

CREATE TRIGGER roles_set_updated_at
  BEFORE UPDATE ON roles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- A staff member can have several roles; their permissions are added together.
-- A role that is still given to someone cannot be deleted.
CREATE TABLE staff_roles (
  staff_id uuid NOT NULL REFERENCES staff (id) ON DELETE CASCADE,
  role_id  uuid NOT NULL REFERENCES roles (id) ON DELETE RESTRICT,
  PRIMARY KEY (staff_id, role_id)
);

CREATE INDEX staff_roles_role_idx ON staff_roles (role_id);
