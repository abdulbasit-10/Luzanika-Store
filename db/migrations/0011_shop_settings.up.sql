-- Settings staff can change in the admin, without a redeploy. There is exactly one row
-- (the CHECK on id makes a second one impossible). Money is in minor units (paisa / cents).
CREATE TABLE shop_settings (
  id                     smallint PRIMARY KEY DEFAULT 1,

  -- Flat shipping fee for one order. 0 means free shipping.
  shipping_fee_pk        bigint NOT NULL DEFAULT 0,
  shipping_fee_de        bigint NOT NULL DEFAULT 0,
  -- German prices already include this VAT: it is shown on the order, never added to it.
  vat_rate_de_percent    numeric(5, 2) NOT NULL DEFAULT 19,
  -- How long an unpaid order keeps its stock before giving it back.
  reservation_minutes    integer NOT NULL DEFAULT 30,

  -- Shown on the site and in emails (placeholders until the client gives the real details).
  contact_email          text NOT NULL DEFAULT 'Luzanika@example.com',
  contact_address        text NOT NULL DEFAULT 'Pak & Germany',
  customer_service_label text NOT NULL DEFAULT 'Customers Complaint Service',
  customer_service_phone text NOT NULL DEFAULT '(480) 555-0103',
  -- A list of { "name": "...", "href": "https://..." }.
  socials                jsonb NOT NULL DEFAULT '[
    {"name": "LinkedIn", "href": "https://www.linkedin.com"},
    {"name": "X", "href": "https://x.com"},
    {"name": "Facebook", "href": "https://www.facebook.com"}
  ]'::jsonb,

  updated_at             timestamptz NOT NULL DEFAULT now(),
  updated_by             uuid REFERENCES staff (id) ON DELETE SET NULL,

  CONSTRAINT shop_settings_single_row CHECK (id = 1),
  CONSTRAINT shop_settings_shipping_fee_pk_valid CHECK (shipping_fee_pk BETWEEN 0 AND 100000000),
  CONSTRAINT shop_settings_shipping_fee_de_valid CHECK (shipping_fee_de BETWEEN 0 AND 100000000),
  CONSTRAINT shop_settings_vat_rate_valid CHECK (vat_rate_de_percent BETWEEN 0 AND 50),
  CONSTRAINT shop_settings_reservation_valid CHECK (reservation_minutes BETWEEN 5 AND 1440),
  CONSTRAINT shop_settings_contact_email_length CHECK (length(contact_email) BETWEEN 3 AND 254),
  CONSTRAINT shop_settings_contact_address_length CHECK (length(contact_address) BETWEEN 1 AND 200),
  CONSTRAINT shop_settings_service_label_length CHECK (length(customer_service_label) BETWEEN 1 AND 80),
  CONSTRAINT shop_settings_service_phone_length CHECK (length(customer_service_phone) BETWEEN 3 AND 30),
  CONSTRAINT shop_settings_socials_is_list CHECK (jsonb_typeof(socials) = 'array')
);

CREATE TRIGGER shop_settings_set_updated_at
  BEFORE UPDATE ON shop_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO shop_settings (id) VALUES (1);
