"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Field } from "@/components/ui/field";
import { toast } from "@/components/ui/toaster";
import { PasswordConfirmDialog } from "@/features/account/password-confirm-dialog";
import {
  EditableSection,
  profileControlClass,
  profileLabelClass,
} from "@/features/account/profile-fields";
import {
  contactSchema,
  type ContactFormValues,
} from "@/features/account/profile-schema";
import { useUpdateProfile } from "@/features/account/use-update-profile";
import {
  AuthError,
  isSessionEnded,
  type AuthUser,
} from "@/features/auth/auth-service";

const toValues = (user: AuthUser): ContactFormValues => ({
  phone: user.phone ?? "",
  email: user.email,
});

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export function ContactSection({ user }: { user: AuthUser }) {
  const [editing, setEditing] = useState(false);
  // The values waiting for the password, when the email is being changed.
  const [awaitingPassword, setAwaitingPassword] =
    useState<ContactFormValues | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: toValues(user),
  });
  const { mutate, isPending } = useUpdateProfile();

  function cancel() {
    reset(toValues(user));
    setAwaitingPassword(null);
    setEditing(false);
  }

  function save(values: ContactFormValues, currentPassword?: string) {
    const changingEmail = normalizeEmail(values.email) !== user.email;

    mutate(
      {
        phone: values.phone,
        ...(changingEmail ? { email: values.email, currentPassword } : {}),
      },
      {
        onSuccess: (updated) => {
          reset(toValues(updated));
          setAwaitingPassword(null);
          setPasswordError(null);
          setEditing(false);
          toast.success("Contact details updated");
        },
        onError: (failure) => {
          if (isSessionEnded(failure)) return;

          if (failure instanceof AuthError) {
            const fields = failure.fields ?? {};
            if (fields.currentPassword) {
              setPasswordError(fields.currentPassword);
              return;
            }
            if (failure.code === "rate_limited") {
              if (awaitingPassword) {
                setPasswordError(
                  "Too many attempts. Please wait a few minutes and try again.",
                );
              } else {
                toast.error("Too many attempts. Please try again later.");
              }
              return;
            }
            if (
              failure.code === "email_taken" ||
              fields.email ||
              fields.phone
            ) {
              setAwaitingPassword(null);
              if (failure.code === "email_taken" || fields.email) {
                setError("email", {
                  type: "server",
                  message:
                    fields.email ?? "An account with this email already exists",
                });
              }
              if (fields.phone) {
                setError("phone", { type: "server", message: fields.phone });
              }
              return;
            }
          }
          setAwaitingPassword(null);
          toast.error("Couldn't save your changes. Please try again.");
        },
      },
    );
  }

  return (
    <>
      <EditableSection
        title="Contact Personal"
        editing={editing}
        saving={isPending}
        onEdit={() => setEditing(true)}
        onCancel={cancel}
        onSubmit={handleSubmit((values) => {
          // Moving the account to another email is the one change that needs the password.
          if (normalizeEmail(values.email) !== user.email) {
            setPasswordError(null);
            setAwaitingPassword(values);
            return;
          }
          save(values);
        })}
      >
        <Field
          id="profile-phone"
          label="Phone number"
          labelClassName={profileLabelClass}
          error={errors.phone?.message}
        >
          <input
            id="profile-phone"
            type="tel"
            readOnly={!editing}
            autoComplete="tel"
            placeholder="Add a phone number"
            aria-invalid={Boolean(errors.phone)}
            aria-describedby="profile-phone-message"
            className={profileControlClass(editing)}
            {...register("phone")}
          />
        </Field>

        <Field
          id="profile-email"
          label="Email"
          labelClassName={profileLabelClass}
          error={errors.email?.message}
        >
          <input
            id="profile-email"
            type="email"
            readOnly={!editing}
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
            aria-describedby="profile-email-message"
            className={profileControlClass(editing)}
            {...register("email")}
          />
        </Field>
      </EditableSection>

      <PasswordConfirmDialog
        open={awaitingPassword !== null}
        onClose={() => {
          if (!isPending) setAwaitingPassword(null);
        }}
        onConfirm={(password) => {
          if (awaitingPassword) save(awaitingPassword, password);
        }}
        title="Confirm your password"
        description="To protect your account, enter your current password to change your email address. You will stay signed in here; other devices will be signed out."
        confirmLabel="Confirm"
        pendingLabel="Saving…"
        pending={isPending}
        error={passwordError}
      />
    </>
  );
}
