DROP INDEX stock_movements_order_idx;
ALTER TABLE stock_movements DROP COLUMN order_id;
DROP TABLE payments;
DROP TABLE order_status_history;
DROP TABLE order_items;
DROP TABLE orders;
DROP TABLE order_counters;
