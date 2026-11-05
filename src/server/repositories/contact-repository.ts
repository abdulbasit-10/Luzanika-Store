import "server-only";

import { execute, selectRows } from "@/server/db/query";
import type { Tx } from "@/server/db/transaction";

export type ContactStatus = "new" | "replied";

export interface ContactMessageRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  status: ContactStatus;
  created_at: Date;
  replied_at: Date | null;
  reply_count: number;
}

export interface ContactReplyRow {
  id: string;
  message_id: string;
  body: string;
  created_at: Date;
  staff_id: string | null;
  staff_name: string | null;
}

export interface ContactFilter {
  status?: ContactStatus;
  /** Matches the name, the email or the text. */
  search?: string;
}

const COLUMNS = `m.id, m.name, m.email::text AS email, m.phone, m.message, m.status, m.created_at, m.replied_at,
  (SELECT count(*)::int FROM contact_replies r WHERE r.message_id = m.id) AS reply_count`;

function likePattern(text: string): string {
  return `%${text.replace(/[\\%_]/g, "\\$&")}%`;
}

export const contactRepository = {
  async insert(input: {
    name: string;
    email: string;
    phone: string;
    message: string;
  }): Promise<string> {
    const rows = await selectRows<{ id: string }>(
      `INSERT INTO contact_messages (name, email, phone, message)
       VALUES (:name, :email, :phone, :message) RETURNING id`,
      input,
    );
    return rows[0].id;
  },

  async list(
    filter: ContactFilter,
    limit: number,
    offset: number,
  ): Promise<{ rows: ContactMessageRow[]; total: number }> {
    const replacements = {
      status: filter.status ?? null,
      search: filter.search ?? null,
      pattern: likePattern(filter.search ?? ""),
    };
    const where = `WHERE (CAST(:status AS text) IS NULL OR m.status = :status)
      AND (CAST(:search AS text) IS NULL OR m.name ILIKE :pattern
           OR m.email::text ILIKE :pattern OR m.message ILIKE :pattern)`;
    const [rows, count] = await Promise.all([
      selectRows<ContactMessageRow>(
        `SELECT ${COLUMNS} FROM contact_messages m ${where}
         ORDER BY m.created_at DESC, m.id LIMIT :limit OFFSET :offset`,
        { ...replacements, limit, offset },
      ),
      selectRows<{ n: number }>(
        `SELECT count(*)::int AS n FROM contact_messages m ${where}`,
        replacements,
      ),
    ]);
    return { rows, total: count[0].n };
  },

  async find(id: string, tx?: Tx): Promise<ContactMessageRow | undefined> {
    const rows = await selectRows<ContactMessageRow>(
      `SELECT ${COLUMNS} FROM contact_messages m WHERE m.id = :id`,
      { id },
      tx,
    );
    return rows[0];
  },

  listReplies(messageId: string, tx?: Tx): Promise<ContactReplyRow[]> {
    return selectRows<ContactReplyRow>(
      `SELECT r.id, r.message_id, r.body, r.created_at, r.staff_id,
              CASE WHEN s.id IS NULL THEN NULL ELSE s.first_name || ' ' || s.last_name END AS staff_name
       FROM contact_replies r LEFT JOIN staff s ON s.id = r.staff_id
       WHERE r.message_id = :messageId ORDER BY r.created_at, r.id`,
      { messageId },
      tx,
    );
  },

  /** Records a sent reply and marks the message as answered. */
  async addReply(
    messageId: string,
    staffId: string,
    body: string,
    tx: Tx,
  ): Promise<void> {
    await execute(
      `INSERT INTO contact_replies (message_id, staff_id, body) VALUES (:messageId, :staffId, :body)`,
      { messageId, staffId, body },
      tx,
    );
    await execute(
      `UPDATE contact_messages SET status = 'replied', replied_at = COALESCE(replied_at, now())
       WHERE id = :messageId`,
      { messageId },
      tx,
    );
  },
};
