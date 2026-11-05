"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { toast } from "@/components/ui/toaster";
import { dateTimeFormat } from "@/features/admin-orders/order-detail-ui";
import { useAdminSession } from "@/features/admin-shell/admin-session";
import {
  DetailCard,
  Fact,
  Field,
  FormError,
  inputClass,
  primaryButton,
} from "@/features/admin-shell/admin-ui";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/utils/cn";

import {
  fetchContactMessage,
  sendContactReply,
  type ContactMessageDetail,
} from "./admin-contact-service";
import { ContactStatusChip } from "./contact-ui";

const REPLY_MAX = 5000;

/** The box to answer a message. The answer is emailed to the person who wrote. */
function ReplyForm({ message }: { message: ContactMessageDetail }) {
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [shown, setShown] = useState(false);
  const problem = text.trim() ? undefined : "Please write a reply";

  const send = useMutation({
    mutationFn: () => sendContactReply(message.id, text),
    onSuccess: async () => {
      toast.success(`Reply sent to ${message.email}`);
      setText("");
      setShown(false);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["admin", "contact", "message", message.id],
        }),
        queryClient.invalidateQueries({ queryKey: ["admin", "contact"] }),
      ]);
    },
  });

  return (
    <DetailCard title={message.replyCount > 0 ? "Reply again" : "Reply"}>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          setShown(true);
          if (!problem) send.mutate();
        }}
        className="flex flex-col gap-3"
      >
        <Field
          id="contact-reply"
          label={`Your answer, emailed to ${message.email}`}
          error={shown ? problem : undefined}
        >
          <textarea
            id="contact-reply"
            value={text}
            onChange={(event) => setText(event.target.value)}
            maxLength={REPLY_MAX}
            rows={6}
            aria-invalid={shown && Boolean(problem)}
            aria-describedby="contact-reply-error"
            className={cn(inputClass, "h-auto py-2")}
          />
        </Field>
        <p className="text-xs text-muted-foreground">
          The email starts with “Hi {message.name},” and quotes their message.
          If they answer it, their answer goes to the shop&apos;s contact email,
          not to this page.
        </p>
        <FormError error={send.error} />
        <div>
          <button
            type="submit"
            disabled={send.isPending}
            className={primaryButton}
          >
            {send.isPending ? "Sending…" : "Send reply"}
          </button>
        </div>
      </form>
    </DetailCard>
  );
}

/** One contact message with the replies already sent and the box to answer it. */
export function AdminContactDetailView({ id }: { id: string }) {
  const { staff, permissions } = useAdminSession();
  const can = (permission: string) =>
    staff.isSuperAdmin || permissions.includes(permission);

  const query = useQuery({
    queryKey: ["admin", "contact", "message", id],
    queryFn: () => fetchContactMessage(id),
    enabled: can("contact.view"),
    retry: (count, error) =>
      !(error instanceof ApiError && error.status === 404) && count < 1,
  });
  const message = query.data;

  let body;
  if (!can("contact.view")) {
    body = (
      <p className="text-sm text-muted-foreground">
        Your role does not include the contact messages.
      </p>
    );
  } else if (query.isPending) {
    body = (
      <p role="status" className="text-sm text-muted-foreground">
        Loading message…
      </p>
    );
  } else if (!message) {
    const missing =
      query.error instanceof ApiError && query.error.status === 404;
    body = (
      <p role="alert" className="text-sm text-danger">
        {missing
          ? "There is no such message."
          : "We couldn't load this message. Check your connection and reload the page."}
      </p>
    );
  } else {
    body = (
      <>
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">
            <h1 className="truncate text-[clamp(1.25rem,3.8dvh,2rem)] leading-tight font-semibold tracking-[-0.5px] text-[#151d2b]">
              {message.name}
            </h1>
            <p className="text-[clamp(0.875rem,2.2dvh,1rem)] text-[#6f7b8c]">
              {message.email}
            </p>
          </div>
          <ContactStatusChip status={message.status} />
        </div>

        <DetailCard title="Message">
          <p className="text-sm leading-6 whitespace-pre-line text-foreground">
            {message.message}
          </p>
          <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3">
            <Fact label="Received">
              {dateTimeFormat.format(new Date(message.createdAt))}
            </Fact>
            <Fact label="Phone">{message.phone || "Not given"}</Fact>
          </dl>
        </DetailCard>

        {message.replies.length > 0 ? (
          <DetailCard title={`Replies sent (${message.replies.length})`}>
            <ul className="flex flex-col gap-3">
              {message.replies.map((reply) => (
                <li
                  key={reply.id}
                  className="rounded-lg border border-border bg-white p-3"
                >
                  <p className="text-sm leading-6 whitespace-pre-line text-foreground">
                    {reply.body}
                  </p>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {reply.by ? reply.by.name : "A former staff member"} ·{" "}
                    {dateTimeFormat.format(new Date(reply.createdAt))}
                  </p>
                </li>
              ))}
            </ul>
          </DetailCard>
        ) : null}

        {can("contact.reply") ? (
          <ReplyForm message={message} />
        ) : (
          <p className="text-sm text-muted-foreground">
            You can read this message but not answer it.
          </p>
        )}
      </>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[75rem] flex-col gap-[clamp(0.5rem,1.6dvh,1.25rem)]">
      <Link
        href="/admin/contact"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Back to Contact Us
      </Link>
      {body}
    </div>
  );
}
