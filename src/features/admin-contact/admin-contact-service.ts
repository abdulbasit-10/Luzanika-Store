import { apiGet, apiPost } from "@/lib/api-client";

export type ContactStatus = "new" | "replied";

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  status: ContactStatus;
  /** ISO 8601. */
  createdAt: string;
  repliedAt: string | null;
  replyCount: number;
}

export interface ContactReply {
  id: string;
  body: string;
  createdAt: string;
  by: { id: string; name: string } | null;
}

export interface ContactMessageDetail extends ContactMessage {
  replies: ContactReply[];
}

export interface ContactMessagePage {
  items: ContactMessage[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ContactFilters {
  status?: ContactStatus;
  search?: string;
}

export const fetchContactMessages = (
  filters: ContactFilters,
  page: number,
  pageSize: number,
) =>
  apiGet<ContactMessagePage>("/admin/contact", {
    params: {
      status: filters.status,
      search: filters.search?.trim() || undefined,
      page,
      pageSize,
    },
  });

export const fetchContactMessage = async (id: string) =>
  (
    await apiGet<{ message: ContactMessageDetail }>(
      `/admin/contact/${encodeURIComponent(id)}`,
    )
  ).message;

/** Emails the reply to the person who wrote, and records it. */
export const sendContactReply = (id: string, message: string) =>
  apiPost(`/admin/contact/${encodeURIComponent(id)}/reply`, {
    message: message.trim(),
  });
