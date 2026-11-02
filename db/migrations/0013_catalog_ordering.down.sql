ALTER TABLE product_detail_sections
  DROP CONSTRAINT product_detail_sections_sort_unique,
  ADD CONSTRAINT product_detail_sections_sort_unique UNIQUE (product_id, sort);

ALTER TABLE product_images
  DROP CONSTRAINT product_images_sort_unique,
  ADD CONSTRAINT product_images_sort_unique UNIQUE (product_id, sort);
