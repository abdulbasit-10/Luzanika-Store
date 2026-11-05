-- New reviews wait for staff to publish them. Reviews that already exist stay published.

ALTER TABLE product_reviews
  DROP CONSTRAINT product_reviews_status_valid,
  ADD CONSTRAINT product_reviews_status_valid CHECK (status IN ('pending', 'published', 'hidden')),
  ALTER COLUMN status SET DEFAULT 'pending';
