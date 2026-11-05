ALTER TABLE order_items
  DROP CONSTRAINT order_items_discount_valid,
  DROP COLUMN discount_percent,
  DROP COLUMN discount_amount;

DROP VIEW product_prices_effective;
DROP TABLE discount_products;
DROP TABLE discounts;
