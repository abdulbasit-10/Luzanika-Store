-- Messages from the contact form are kept here (they used to be only emailed), so staff can read
-- and answer them in the admin. A reply is emailed to the visitor and recorded with who sent it.

CREATE TABLE contact_messages (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  email      citext NOT NULL,
  phone      text NOT NULL DEFAULT '',
  message    text NOT NULL,
  -- new: nobody answered yet. replied: at least one reply was sent.
  status     text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  replied_at timestamptz,

  CONSTRAINT contact_messages_status_valid CHECK (status IN ('new', 'replied')),
  CONSTRAINT contact_messages_name_length CHECK (length(btrim(name)) BETWEEN 1 AND 80),
  CONSTRAINT contact_messages_message_length CHECK (length(btrim(message)) BETWEEN 1 AND 2000),
  CONSTRAINT contact_messages_replied_together CHECK ((status = 'replied') = (replied_at IS NOT NULL))
);

CREATE INDEX contact_messages_status_idx ON contact_messages (status, created_at DESC, id);

CREATE TABLE contact_replies (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES contact_messages (id) ON DELETE CASCADE,
  -- Kept as NULL if the staff member is removed later.
  staff_id   uuid REFERENCES staff (id) ON DELETE SET NULL,
  body       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT contact_replies_body_length CHECK (length(btrim(body)) BETWEEN 1 AND 5000)
);

CREATE INDEX contact_replies_message_idx ON contact_replies (message_id, created_at);
