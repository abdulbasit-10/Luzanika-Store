import "server-only";

import { z } from "zod";

import { email, personName } from "@/server/validation/auth-schemas";

// Policy (length, common passwords) is checked by the service so the message names the right field.
const passwordInput = z.string().max(1000, "Password is too long");

const roleName = z
  .string()
  .trim()
  .min(1, "Please enter a name")
  .max(60, "Please keep the name under 60 characters")
  .regex(/^[^\p{Cc}]+$/u, "Please enter a valid name");

const roleDescription = z
  .string()
  .trim()
  .max(300, "Please keep it under 300 characters")
  .regex(/^[^\p{Cc}]*$/u, "Please enter a valid description");

const permissionNames = z.array(z.string().max(60)).max(100);

export const staffIdSchema = z.uuid();

export const staffLoginSchema = z
  .object({
    email,
    password: z.string().min(1, "Please enter your password").max(1000),
  })
  .strict();

export const twoFactorEnableSchema = z
  .object({
    code: z
      .string()
      .trim()
      .regex(/^\d{6}$/, "Enter the 6-digit code"),
  })
  .strict();

/** Either the 6-digit code from the app or one recovery code, not both. */
export const twoFactorVerifySchema = z
  .object({
    code: z.string().trim().max(20).optional(),
    recoveryCode: z.string().trim().max(30).optional(),
  })
  .strict()
  .refine(
    (body) => (body.code === undefined) !== (body.recoveryCode === undefined),
    {
      message: "Send a code or a recovery code",
    },
  );

export const staffChangePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, "Please enter your current password")
      .max(1000),
    newPassword: passwordInput,
  })
  .strict();

export const staffForgotPasswordSchema = z.object({ email }).strict();

export const staffResetPasswordSchema = z
  .object({
    token: z.string().min(1, "This link is invalid or has expired").max(200),
    password: passwordInput,
  })
  .strict();

export const inviteStaffSchema = z
  .object({
    email,
    firstName: personName("first name"),
    lastName: personName("last name"),
    roleIds: z.array(z.uuid()).max(20).default([]),
    isSuperAdmin: z.boolean().default(false),
  })
  .strict();

export const updateStaffSchema = z
  .object({
    firstName: personName("first name"),
    lastName: personName("last name"),
    status: z.enum(["active", "disabled"]),
    isSuperAdmin: z.boolean(),
    roleIds: z.array(z.uuid()).max(20),
  })
  .partial()
  .strict();

export const staffListQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  status: z.enum(["invited", "active", "disabled"]).optional(),
});

export const createRoleSchema = z
  .object({
    name: roleName,
    description: roleDescription.default(""),
    permissions: permissionNames,
  })
  .strict();

export const updateRoleSchema = z
  .object({
    name: roleName,
    description: roleDescription,
    permissions: permissionNames,
  })
  .partial()
  .strict();
