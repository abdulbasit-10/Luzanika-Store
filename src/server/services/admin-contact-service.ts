import "server-only";

import { recordAudit } from "@/server/audit/audit";
import { withTransaction } from "@/server/db/transaction";
import { getEmailSender } from "@/server/email/email-sender";
import { contactReplyEmail } from "@/server/email/templates";
import { ApiError } from "@/server/http/api-error";
import { logger, serializeError } from "@/server/logger";
import {
  contactRepository,
  type ContactFilter,
  type ContactMessageRow,
  type ContactReplyRow,
} from "@/server/repositories/contact-repository";
import { getShopSettings } from "@/server/services/settings-service";
import type { AdminContext } from "@/server/services/staff-admin-service";

export interface ContactMessageDto {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  status: "new" | "replied";
  createdAt: string;
  repliedAt: string | null;
  replyCount: number;
}

export interface ContactReplyDto {
  id: string;
  body: string;
  createdAt: string;
  by: { id: string; name: string } | null;
}

export interface ContactMessageDetailDto extends ContactMessageDto {
  replies: ContactReplyDto[];
}

const iso = (value: Date) => new Date(value).toISOString();

function toDto(row: ContactMessageRow): ContactMessageDto {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    message: row.message,
    status: row.status,
    createdAt: iso(row.created_at),
    repliedAt: row.replied_at ? iso(row.replied_at) : null,
    replyCount: row.reply_count,
  };
}

const toReplyDto = (row: ContactReplyRow): ContactReplyDto => ({
  id: row.id,
  body: row.body,
  createdAt: iso(row.created_at),
  by:
    row.staff_id && row.staff_name
      ? { id: row.staff_id, name: row.staff_name }
      : null,
});

export async function listContactMessages(
  filter: ContactFilter,
  page: number,
  pageSize: number,
) {
  const { rows, total } = await contactRepository.list(
    filter,
    pageSize,
    (page - 1) * pageSize,
  );
  return { items: rows.map(toDto), total, page, pageSize };
}

export async function getContactMessage(
  id: string,
): Promise<ContactMessageDetailDto> {
  const row = await contactRepository.find(id);
  if (!row) throw new ApiError("not_found");
  const replies = await contactRepository.listReplies(id);
  return { ...toDto(row), replies: replies.map(toReplyDto) };
}

/**
 * Answers a message by email. The email is sent first: if it cannot be sent
 * the staff member is told and nothing is recorded, so the message stays as it
 * was and they can try again. Once it is sent the reply is saved with who sent
 * it, the message becomes "replied", and the audit log notes it.
 */
export async function replyToContactMessage(
  ctx: AdminContext,
  id: string,
  reply: string,
): Promise<ContactMessageDetailDto> {
  const row = await contactRepository.find(id);
  if (!row) throw new ApiError("not_found");

  const { contact } = await getShopSettings();
  try {
    await getEmailSender().send(
      contactReplyEmail({
        to: row.email,
        name: row.name,
        reply,
        originalMessage: row.message,
        replyTo: contact.email,
      }),
    );
  } catch (error) {
    logger.error("contact reply email failed", {
      error: serializeError(error),
    });
    throw new ApiError("service_unavailable", {
      message:
        "We couldn't send the reply right now. Nothing was saved, so you can try again shortly.",
    });
  }

  await withTransaction(async (tx) => {
    await contactRepository.addReply(id, ctx.actor.id, reply, tx);
    await recordAudit(
      tx,
      ctx.actor,
      {
        action: "contact.reply",
        entityType: "contact_message",
        entityId: id,
        before: { status: row.status },
        after: { status: "replied", to: row.email },
      },
      ctx.requestId,
    );
  });

  return getContactMessage(id);
}
