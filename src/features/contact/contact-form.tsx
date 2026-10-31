"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";

import { FormField } from "@/components/ui/form-field";
import { toast } from "@/components/ui/toaster";
import { contactForm } from "@/features/contact/contact-content";
import {
  contactSchema,
  type ContactFormValues,
} from "@/features/contact/contact-schema";
import { submitContactMessage } from "@/features/contact/contact-service";
import { cn } from "@/utils/cn";

const controlClass =
  "w-full rounded-md bg-white px-4 text-base text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent aria-invalid:outline-2 aria-invalid:outline-red-300 lg:text-[max(0.8125rem,calc(16*var(--contact-fit)))]";

const inputHeight = "h-12 lg:h-[max(1.75rem,calc(68*var(--contact-fit)))]";
const labelClass =
  "lg:text-[max(0.75rem,calc(18*var(--contact-fit)))] lg:leading-tight";

export function ContactForm() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: "", email: "", phone: "", message: "" },
  });

  const { mutate, isPending, isError } = useMutation({
    mutationFn: submitContactMessage,
    onSuccess: () => {
      reset();
      toast.success(contactForm.successMessage);
    },
  });

  return (
    <form
      noValidate
      onSubmit={handleSubmit((values) => mutate(values))}
      className="flex flex-col gap-4 lg:gap-[calc(24*var(--contact-fit))]"
    >
      <FormField
        id="contact-name"
        label="Name"
        error={errors.name?.message}
        labelClassName={labelClass}
      >
        <input
          id="contact-name"
          type="text"
          autoComplete="name"
          aria-invalid={Boolean(errors.name)}
          aria-describedby="contact-name-error"
          className={cn(controlClass, inputHeight)}
          {...register("name")}
        />
      </FormField>
      <FormField
        id="contact-email"
        label="Email Address"
        error={errors.email?.message}
        labelClassName={labelClass}
      >
        <input
          id="contact-email"
          type="email"
          autoComplete="email"
          aria-invalid={Boolean(errors.email)}
          aria-describedby="contact-email-error"
          className={cn(controlClass, inputHeight)}
          {...register("email")}
        />
      </FormField>
      <FormField
        id="contact-phone"
        label="Phone Number"
        error={errors.phone?.message}
        labelClassName={labelClass}
      >
        <input
          id="contact-phone"
          type="tel"
          autoComplete="tel"
          aria-invalid={Boolean(errors.phone)}
          aria-describedby="contact-phone-error"
          className={cn(controlClass, inputHeight)}
          {...register("phone")}
        />
      </FormField>
      <FormField
        id="contact-message"
        label="Messages"
        error={errors.message?.message}
        labelClassName={labelClass}
      >
        <textarea
          id="contact-message"
          aria-invalid={Boolean(errors.message)}
          aria-describedby="contact-message-error"
          className={cn(
            controlClass,
            "h-32 resize-none py-3 lg:h-[max(2.75rem,calc(152*var(--contact-fit)))] lg:py-2",
          )}
          {...register("message")}
        />
      </FormField>

      <button
        type="submit"
        disabled={isPending}
        className="mt-2 h-14 w-full cursor-pointer rounded-full bg-accent font-button text-base font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-60 lg:mt-[calc(8*var(--contact-fit))] lg:h-[max(2rem,calc(64*var(--contact-fit)))]"
      >
        {isPending ? "Sending…" : contactForm.submitLabel}
      </button>

      {isError ? (
        <p role="alert" className="text-center text-sm text-red-300">
          {contactForm.errorMessage}
        </p>
      ) : null}
    </form>
  );
}
