-- Staff can delete a cancelled order. Deleting only hides it from the normal order list: the
-- order, its payments and the audit log stay. Only a cancelled order can be deleted.

ALTER TABLE orders
  ADD COLUMN deleted_at timestamptz,
  ADD CONSTRAINT orders_deleted_only_when_cancelled CHECK (deleted_at IS NULL OR status = 'cancelled');
