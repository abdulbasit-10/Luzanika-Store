"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Field } from "@/components/ui/field";
import { toast } from "@/components/ui/toaster";
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
import { AuthError, type AuthUser } from "@/features/auth/auth-service";

const toValues = (user: AuthUser): ContactFormValues => ({
  phone: user.phone ?? "",
  email: user.email,
});

export function ContactSection({ user }: { user: AuthUser }) {
  const [editing, setEditing] = useState(false);
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
    setEditing(false);
  }

  return (
    <EditableSection
      title="Contact Personal"
      editing={editing}
      saving={isPending}
      onEdit={() => setEditing(true)}
      onCancel={cancel}
      onSubmit={handleSubmit((values) =>
        mutate(values, {
          onSuccess: (updated) => {
            reset(toValues(updated));
            setEditing(false);
            toast.success("Contact details updated");
          },
          onError: (failure) => {
            if (
              failure instanceof AuthError &&
              failure.code === "email_taken"
            ) {
              setError("email", {
                type: "server",
                message: "An account with this email already exists",
              });
              return;
            }
            toast.error("Couldn't save your changes. Please try again.");
          },
        }),
      )}
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
  );
}
