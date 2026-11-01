"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarDays } from "lucide-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { Field } from "@/components/ui/field";
import { toast } from "@/components/ui/toaster";
import { formatBirthDate } from "@/features/account/format-birth-date";
import { GENDER_OPTIONS } from "@/features/account/profile-options";
import {
  EditableSection,
  ProfileSelect,
  profileControlClass,
  profileLabelClass,
} from "@/features/account/profile-fields";
import {
  personalSchema,
  type PersonalFormValues,
} from "@/features/account/profile-schema";
import { useUpdateProfile } from "@/features/account/use-update-profile";
import { isSessionEnded, type AuthUser } from "@/features/auth/auth-service";

const toValues = (user: AuthUser): PersonalFormValues => ({
  firstName: user.firstName,
  lastName: user.lastName,
  gender: user.gender ?? "",
  dateOfBirth: user.dateOfBirth ?? "",
});

export function PersonalSection({ user }: { user: AuthUser }) {
  const [editing, setEditing] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<PersonalFormValues>({
    resolver: zodResolver(personalSchema),
    defaultValues: toValues(user),
  });
  const { mutate, isPending } = useUpdateProfile();
  const dateOfBirth = useWatch({ control, name: "dateOfBirth" });

  function cancel() {
    reset(toValues(user));
    setEditing(false);
  }

  return (
    <EditableSection
      title="Personal Information"
      editing={editing}
      saving={isPending}
      onEdit={() => setEditing(true)}
      onCancel={cancel}
      onSubmit={handleSubmit((values) =>
        mutate(values, {
          onSuccess: (updated) => {
            reset(toValues(updated));
            setEditing(false);
            toast.success("Personal information updated");
          },
          onError: (failure) => {
            if (isSessionEnded(failure)) return;
            toast.error("Couldn't save your changes. Please try again.");
          },
        }),
      )}
    >
      <Field
        id="profile-first-name"
        label="First name"
        labelClassName={profileLabelClass}
        error={errors.firstName?.message}
      >
        <input
          id="profile-first-name"
          readOnly={!editing}
          autoComplete="given-name"
          aria-invalid={Boolean(errors.firstName)}
          aria-describedby="profile-first-name-message"
          className={profileControlClass(editing)}
          {...register("firstName")}
        />
      </Field>

      <Field
        id="profile-last-name"
        label="Last Name"
        labelClassName={profileLabelClass}
        error={errors.lastName?.message}
      >
        <input
          id="profile-last-name"
          readOnly={!editing}
          autoComplete="family-name"
          aria-invalid={Boolean(errors.lastName)}
          aria-describedby="profile-last-name-message"
          className={profileControlClass(editing)}
          {...register("lastName")}
        />
      </Field>

      <Field
        id="profile-gender"
        label="Gender"
        labelClassName={profileLabelClass}
        error={errors.gender?.message}
      >
        <ProfileSelect
          id="profile-gender"
          editing={editing}
          aria-invalid={Boolean(errors.gender)}
          aria-describedby="profile-gender-message"
          {...register("gender")}
        >
          <option value="">Select gender</option>
          {GENDER_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </ProfileSelect>
      </Field>

      <Field
        id="profile-birth-date"
        label="Date of birth"
        labelClassName={profileLabelClass}
        error={errors.dateOfBirth?.message}
      >
        {editing ? (
          <input
            id="profile-birth-date"
            type="date"
            autoComplete="bday"
            aria-invalid={Boolean(errors.dateOfBirth)}
            aria-describedby="profile-birth-date-message"
            className={profileControlClass(true)}
            {...register("dateOfBirth")}
          />
        ) : (
          <span className="relative block">
            <input
              id="profile-birth-date"
              readOnly
              value={formatBirthDate(dateOfBirth)}
              placeholder="Select date"
              className={profileControlClass(false)}
            />
            <CalendarDays
              aria-hidden
              className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
          </span>
        )}
      </Field>
    </EditableSection>
  );
}
