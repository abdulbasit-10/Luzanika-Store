-- Every change made through the admin: who, when, what, before and after.
-- Rows are only ever added. A trigger refuses UPDATE and DELETE for every login, and the
-- running website's login is also stripped of those rights (when that login exists).
CREATE TABLE audit_log (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  at          timestamptz NOT NULL DEFAULT now(),
  -- The staff member's id and the email they had at the time, so the record stays readable later.
  staff_id    uuid REFERENCES staff (id),
  staff_email text,
  -- e.g. "orders.status_change", "stock.adjust", "settings.update".
  action      text NOT NULL,
  entity_type text NOT NULL,
  entity_id   text,
  -- What the thing looked like before and after. Never contains passwords, hashes or secrets.
  before      jsonb,
  after       jsonb,
  request_id  text,
  -- Only kept for sign-in events.
  ip          inet,

  CONSTRAINT audit_log_action_length CHECK (length(action) BETWEEN 1 AND 100),
  CONSTRAINT audit_log_entity_type_length CHECK (length(entity_type) BETWEEN 1 AND 60),
  CONSTRAINT audit_log_entity_id_length CHECK (entity_id IS NULL OR length(entity_id) <= 120)
);

CREATE INDEX audit_log_at_idx ON audit_log (at DESC, id DESC);
CREATE INDEX audit_log_staff_idx ON audit_log (staff_id, at DESC);
CREATE INDEX audit_log_entity_idx ON audit_log (entity_type, entity_id, at DESC);
CREATE INDEX audit_log_action_idx ON audit_log (action, at DESC);

CREATE FUNCTION audit_log_is_append_only() RETURNS trigger
  LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only';
END;
$$;

CREATE TRIGGER audit_log_no_change
  BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_is_append_only();

-- The website's own login may add and read rows, nothing else. (Skipped where that login
-- does not exist, for example in a throw-away test database.)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'luzanika_app') THEN
    REVOKE UPDATE, DELETE, TRUNCATE ON audit_log FROM luzanika_app;
  END IF;
END;
$$;
