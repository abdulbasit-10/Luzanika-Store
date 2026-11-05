-- Real product reviews, and the timing of the home page "Special offers" row.

-- A review by a customer whose order for the product was completed ("verified purchase").
-- One review per customer per product. Staff can hide a review (it then no longer shows or counts)
-- and bring it back; nothing is ever edited by staff. The author's name is kept as written ("Ayesha K."),
-- so the review still reads right if the customer's account changes, and is replaced by "Former customer"
-- when the customer deletes their account.
CREATE TABLE product_reviews (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    uuid NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  customer_id   uuid REFERENCES customers (id) ON DELETE SET NULL,
  -- The completed order that proves the purchase.
  order_id      uuid REFERENCES orders (id) ON DELETE SET NULL,
  author_name   text NOT NULL,
  rating        smallint NOT NULL,
  title         text,
  body          text NOT NULL,
  status        text NOT NULL DEFAULT 'published',
  hidden_reason text,
  hidden_at     timestamptz,
  hidden_by     uuid REFERENCES staff (id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT product_reviews_rating_valid CHECK (rating BETWEEN 1 AND 5),
  CONSTRAINT product_reviews_status_valid CHECK (status IN ('published', 'hidden')),
  CONSTRAINT product_reviews_author_length CHECK (length(btrim(author_name)) BETWEEN 1 AND 80),
  CONSTRAINT product_reviews_title_length CHECK (title IS NULL OR length(btrim(title)) BETWEEN 1 AND 80),
  CONSTRAINT product_reviews_body_length CHECK (length(btrim(body)) BETWEEN 10 AND 2000),
  CONSTRAINT product_reviews_hidden_reason_length CHECK (hidden_reason IS NULL OR length(hidden_reason) <= 300),
  CONSTRAINT product_reviews_hidden_together CHECK ((status = 'hidden') = (hidden_at IS NOT NULL))
);

CREATE TRIGGER product_reviews_set_updated_at
  BEFORE UPDATE ON product_reviews
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- One review per customer per product.
CREATE UNIQUE INDEX product_reviews_one_per_customer
  ON product_reviews (product_id, customer_id) WHERE customer_id IS NOT NULL;
-- The reviews a product page shows, newest first.
CREATE INDEX product_reviews_product_idx
  ON product_reviews (product_id, created_at DESC, id) WHERE status = 'published';
-- The staff list.
CREATE INDEX product_reviews_status_idx ON product_reviews (status, created_at DESC, id);

-- The ratings that came with the sample catalogue were invented. From now on a product's rating
-- is worked out only from its published reviews (and stays empty until it has one).
UPDATE products SET rating_avg = NULL, rating_count = 0;

-- When the "Special offers" row ends and what it says. There is exactly one row.
-- No end time means the row shows without a countdown; a past end time hides the row.
CREATE TABLE home_offer (
  id         smallint PRIMARY KEY DEFAULT 1,
  ends_at    timestamptz,
  headline   text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES staff (id) ON DELETE SET NULL,

  CONSTRAINT home_offer_single_row CHECK (id = 1),
  CONSTRAINT home_offer_headline_length CHECK (headline IS NULL OR length(btrim(headline)) BETWEEN 1 AND 80)
);

INSERT INTO home_offer (id) VALUES (1);
