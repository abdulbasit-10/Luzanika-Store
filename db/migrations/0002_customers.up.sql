-- Shop customers (not staff). Staff accounts live in their own tables.
-- Limits here mirror the validation in the signup and profile forms, so the
-- database refuses bad data even if a bug in the app lets it through.
CREATE TABLE customers (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- citext makes the unique index case-insensitive: Ada@x.com and ada@x.com are one person.
  email             citext NOT NULL,
  email_verified_at timestamptz,
  -- Argon2id hash only. The password itself is never stored.
  password_hash     text NOT NULL,

  first_name        text NOT NULL,
  last_name         text NOT NULL,
  phone             text,
  gender            text,
  date_of_birth     date,
  language          text NOT NULL DEFAULT 'en',
  -- Storage key of the profile photo (the file itself is not in the database).
  avatar_key        text,

  -- active: normal. blocked: staff disabled login. anonymised: the person asked to be
  -- deleted; their details are wiped but orders are kept for accounting.
  status            text NOT NULL DEFAULT 'active',
  last_login_at     timestamptz,
  anonymised_at     timestamptz,

  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT customers_email_unique UNIQUE (email),
  CONSTRAINT customers_email_format CHECK (
    email = btrim(email::text)::citext
    AND length(email::text) BETWEEN 3 AND 254
    AND position('@' IN email::text) > 1
  ),
  CONSTRAINT customers_password_hash_present CHECK (password_hash <> ''),
  CONSTRAINT customers_first_name_length CHECK (length(btrim(first_name)) BETWEEN 1 AND 50),
  CONSTRAINT customers_last_name_length CHECK (length(btrim(last_name)) BETWEEN 1 AND 50),
  CONSTRAINT customers_phone_length CHECK (phone IS NULL OR length(phone) <= 20),
  CONSTRAINT customers_gender_allowed CHECK (
    gender IS NULL OR gender IN ('male', 'female', 'prefer-not-to-say')
  ),
  CONSTRAINT customers_birth_date_plausible CHECK (
    date_of_birth IS NULL OR date_of_birth >= DATE '1900-01-01'
  ),
  CONSTRAINT customers_language_allowed CHECK (language IN ('en', 'de')),
  CONSTRAINT customers_avatar_key_length CHECK (avatar_key IS NULL OR length(avatar_key) <= 255),
  CONSTRAINT customers_status_allowed CHECK (status IN ('active', 'blocked', 'anonymised')),
  CONSTRAINT customers_anonymised_has_date CHECK (
    status <> 'anonymised' OR anonymised_at IS NOT NULL
  )
);

CREATE TRIGGER customers_set_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Newest customers first in admin lists.
CREATE INDEX customers_created_at_idx ON customers (created_at DESC);
