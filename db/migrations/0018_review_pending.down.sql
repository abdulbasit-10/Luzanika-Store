-- A pending review has no place in the old two-status world: it is published.
UPDATE product_reviews SET status = 'published' WHERE status = 'pending';

ALTER TABLE product_reviews
  DROP CONSTRAINT product_reviews_status_valid,
  ADD CONSTRAINT product_reviews_status_valid CHECK (status IN ('published', 'hidden')),
  ALTER COLUMN status SET DEFAULT 'published';
