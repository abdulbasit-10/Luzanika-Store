-- Reordering product photos and detail sections changes several "sort" values at once
-- (swapping two photos briefly gives both the same number). A normal unique constraint would
-- refuse that in the middle of the statement, so these are checked at the end of the
-- transaction instead (the same approach home_features already uses).
ALTER TABLE product_images
  DROP CONSTRAINT product_images_sort_unique,
  ADD CONSTRAINT product_images_sort_unique UNIQUE (product_id, sort) DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE product_detail_sections
  DROP CONSTRAINT product_detail_sections_sort_unique,
  ADD CONSTRAINT product_detail_sections_sort_unique UNIQUE (product_id, sort) DEFERRABLE INITIALLY DEFERRED;
