-- Case-insensitive text, used for emails and coupon codes.
CREATE EXTENSION IF NOT EXISTS citext;

-- Keeps updated_at truthful even when a row is changed with plain SQL
-- (by a migration, a script, or a database admin) and not through the app.
CREATE FUNCTION set_updated_at() RETURNS trigger
  LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
