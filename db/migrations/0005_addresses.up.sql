-- Delivery addresses a customer saved in their address book. (An order keeps its own copy
-- of the address it shipped to, so editing or deleting a saved address never changes history.)
CREATE TABLE addresses (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers (id) ON DELETE CASCADE,

  full_name   text NOT NULL,
  phone       text NOT NULL,
  country     text NOT NULL,
  city        text NOT NULL,
  address     text NOT NULL,
  zip         text NOT NULL,
  is_default  boolean NOT NULL DEFAULT false,

  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT addresses_full_name_length CHECK (length(btrim(full_name)) BETWEEN 1 AND 80),
  CONSTRAINT addresses_phone_length CHECK (length(btrim(phone)) BETWEEN 6 AND 20),
  CONSTRAINT addresses_country_length CHECK (length(btrim(country)) BETWEEN 1 AND 60),
  CONSTRAINT addresses_city_length CHECK (length(btrim(city)) BETWEEN 1 AND 60),
  CONSTRAINT addresses_address_length CHECK (length(btrim(address)) BETWEEN 1 AND 160),
  CONSTRAINT addresses_zip_length CHECK (length(btrim(zip)) BETWEEN 1 AND 12)
);

CREATE TRIGGER addresses_set_updated_at
  BEFORE UPDATE ON addresses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- A customer's address book, in the order they were added.
CREATE INDEX addresses_customer_idx ON addresses (customer_id, created_at, id);

-- At most one default address per customer. The database enforces it, so a bug or two
-- requests at the same moment can never leave a customer with two defaults.
CREATE UNIQUE INDEX addresses_one_default_per_customer
  ON addresses (customer_id) WHERE is_default;
