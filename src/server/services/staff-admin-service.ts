import "server-only";

import {
  isPermission,
  normalizePermissions,
  PERMISSION_LIST,
  PERMISSIONS,
  type Permission,
} from "@/server/admin/permissions";
import { recordAudit, type AuditActor } from "@/server/audit/audit";
import { getAuthEnv } from "@/server/config/auth-env";
import { withTransaction, type Tx } from "@/server/db/transaction";
import { getEmailSender } from "@/server/email/email-sender";
import { staffInviteEmail } from "@/server/email/templates";
import { ApiError } from "@/server/http/api-error";
import { logger, serializeError } from "@/server/logger";
import {
  RoleNameTakenError,
  roleRepository,
  type RoleRecord,
} from "@/server/repositories/role-repository";
import {
  StaffEmailTakenError,
  staffRepository,
  type StaffListFilter,
  type StaffRecord,
} from "@/server/repositories/staff-repository";
import { staffSessionRepository } from "@/server/repositories/staff-session-repository";
import {
  staffRecoveryCodeRepository,
  staffTokenRepository,
} from "@/server/repositories/staff-token-repository";
import { generateToken, hashToken } from "@/server/security/tokens";
import {
  normalizeStaffEmail,
  STAFF_INVITE_HOURS,
} from "@/server/services/staff-auth-service";

/** Who is making the change, for the audit log and the invite email. */
export interface AdminContext {
  actor: AuditActor & { name: string };
  requestId: string;
}

export interface StaffDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: StaffRecord["status"];
  isSuperAdmin: boolean;
  roles: { id: string; name: string }[];
  twoFactorEnabled: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface RoleDto {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  staffCount: number;
}

function toRoleDto(role: RoleRecord): RoleDto {
  return {
    id: role.id,
    name: role.name,
    description: role.description,
    permissions: role.permissions,
    staffCount: role.staffCount,
  };
}

function toStaffDto(
  staff: StaffRecord,
  roles: { id: string; name: string }[],
): StaffDto {
  return {
    id: staff.id,
    email: staff.email,
    firstName: staff.firstName,
    lastName: staff.lastName,
    status: staff.status,
    isSuperAdmin: staff.isSuperAdmin,
    roles,
    twoFactorEnabled: staff.totpEnabledAt !== null,
    lastLoginAt: staff.lastLoginAt?.toISOString() ?? null,
    createdAt: staff.createdAt.toISOString(),
  };
}

/** The data the admin needs to build a role form: every permission with its description. */
export function listPermissionCatalogue(): {
  name: Permission;
  description: string;
}[] {
  return PERMISSION_LIST.map((name) => ({
    name,
    description: PERMISSIONS[name],
  }));
}

const notFound = () => new ApiError("not_found");

async function dtoFor(staff: StaffRecord, tx?: Tx): Promise<StaffDto> {
  const roles = await roleRepository.rolesForStaff([staff.id], tx);
  return toStaffDto(staff, roles.get(staff.id) ?? []);
}

/** Refuses role ids that do not exist, so a typo never silently gives someone no role. */
async function requireRoles(roleIds: string[], tx: Tx): Promise<string[]> {
  const unique = [...new Set(roleIds)];
  const existing = new Set(await roleRepository.existingIds(unique, tx));
  if (unique.some((id) => !existing.has(id))) {
    throw new ApiError("validation_failed", {
      fields: { roleIds: "One of these roles does not exist" },
    });
  }
  return unique;
}

const lastSuperAdmin = () =>
  new ApiError("conflict", {
    message: "There must always be at least one active super admin.",
  });

// ---------------------------------------------------------------- staff

export async function listStaff(filter: StaffListFilter): Promise<StaffDto[]> {
  const staff = await staffRepository.list(filter);
  const roles = await roleRepository.rolesForStaff(
    staff.map((item) => item.id),
  );
  return staff.map((item) => toStaffDto(item, roles.get(item.id) ?? []));
}

export async function getStaff(id: string): Promise<StaffDto> {
  const staff = await staffRepository.findById(id);
  if (!staff) throw notFound();
  return dtoFor(staff);
}

/** Emails the invite link. A failure is reported to the caller but never undoes the invite: it can be sent again. */
async function sendInvite(
  ctx: AdminContext,
  staff: StaffRecord,
): Promise<boolean> {
  const token = generateToken();
  await withTransaction((tx) =>
    staffTokenRepository.replace(
      {
        staffId: staff.id,
        type: "invite",
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + STAFF_INVITE_HOURS * 60 * 60 * 1000),
      },
      tx,
    ),
  );

  const link = `${getAuthEnv().NEXT_PUBLIC_SITE_URL}/admin/accept-invite?token=${token}`;
  try {
    await getEmailSender().send(
      staffInviteEmail({
        to: staff.email,
        firstName: staff.firstName,
        invitedByName: ctx.actor.name,
        link,
        validForHours: STAFF_INVITE_HOURS,
      }),
    );
    return true;
  } catch (error) {
    logger.error("staff invite email failed", { error: serializeError(error) });
    return false;
  }
}

export async function inviteStaff(
  ctx: AdminContext,
  input: {
    email: string;
    firstName: string;
    lastName: string;
    roleIds: string[];
    isSuperAdmin: boolean;
  },
): Promise<{ staff: StaffDto; inviteEmailSent: boolean }> {
  let created: StaffRecord;
  try {
    created = await withTransaction(async (tx) => {
      const roleIds = await requireRoles(input.roleIds, tx);
      const staff = await staffRepository.insertInvited(
        {
          email: normalizeStaffEmail(input.email),
          firstName: input.firstName,
          lastName: input.lastName,
          isSuperAdmin: input.isSuperAdmin,
          invitedBy: ctx.actor.id,
        },
        tx,
      );
      await roleRepository.setStaffRoles(staff.id, roleIds, tx);
      await recordAudit(
        tx,
        ctx.actor,
        {
          action: "staff.invite",
          entityType: "staff",
          entityId: staff.id,
          after: {
            email: staff.email,
            firstName: staff.firstName,
            lastName: staff.lastName,
            isSuperAdmin: staff.isSuperAdmin,
            roleIds,
          },
        },
        ctx.requestId,
      );
      return staff;
    });
  } catch (error) {
    if (error instanceof StaffEmailTakenError) {
      throw new ApiError("conflict", {
        message: "Someone with this email already works here.",
        fields: { email: "Someone with this email already works here" },
      });
    }
    throw error;
  }

  const inviteEmailSent = await sendInvite(ctx, created);
  return { staff: await dtoFor(created), inviteEmailSent };
}

export async function resendInvite(
  ctx: AdminContext,
  id: string,
): Promise<{ staff: StaffDto; inviteEmailSent: boolean }> {
  const staff = await staffRepository.findById(id);
  if (!staff) throw notFound();
  if (staff.status !== "invited") {
    throw new ApiError("conflict", {
      message: "This person has already accepted their invite.",
    });
  }
  const inviteEmailSent = await sendInvite(ctx, staff);
  await recordAudit(
    undefined,
    ctx.actor,
    { action: "staff.invite_resent", entityType: "staff", entityId: staff.id },
    ctx.requestId,
  );
  return { staff: await dtoFor(staff), inviteEmailSent };
}

export interface StaffChanges {
  firstName?: string;
  lastName?: string;
  /** "active" re-enables a disabled person; "disabled" stops them signing in at once. */
  status?: "active" | "disabled";
  isSuperAdmin?: boolean;
  roleIds?: string[];
}

export async function updateStaff(
  ctx: AdminContext,
  id: string,
  changes: StaffChanges,
): Promise<StaffDto> {
  return withTransaction(async (tx) => {
    // Every active super admin is locked, so two requests cannot both remove "the other" one.
    const superAdminIds = await staffRepository.lockActiveSuperAdmins(tx);
    const staff = await staffRepository.lockById(id, tx);
    if (!staff) throw notFound();

    const beforeRoles =
      (await roleRepository.rolesForStaff([id], tx)).get(id) ?? [];
    const before = {
      firstName: staff.firstName,
      lastName: staff.lastName,
      status: staff.status,
      isSuperAdmin: staff.isSuperAdmin,
      roleIds: beforeRoles.map((role) => role.id),
    };

    let nextStatus: StaffRecord["status"] | undefined;
    if (changes.status === "disabled" && staff.status !== "disabled") {
      nextStatus = "disabled";
    } else if (changes.status === "active" && staff.status === "disabled") {
      // Someone who never accepted their invite goes back to waiting for it.
      nextStatus = staff.passwordHash ? "active" : "invited";
    }

    const losesSuperAdmin =
      staff.isSuperAdmin &&
      staff.status === "active" &&
      (nextStatus === "disabled" || changes.isSuperAdmin === false);

    if (
      id === ctx.actor.id &&
      (nextStatus === "disabled" || changes.isSuperAdmin === false)
    ) {
      throw new ApiError("conflict", {
        message:
          "You cannot disable yourself or remove your own super admin access.",
      });
    }
    if (
      losesSuperAdmin &&
      superAdminIds.filter((other) => other !== id).length === 0
    ) {
      throw lastSuperAdmin();
    }

    await staffRepository.update(
      id,
      {
        firstName: changes.firstName,
        lastName: changes.lastName,
        status: nextStatus,
        isSuperAdmin: changes.isSuperAdmin,
      },
      tx,
    );
    let roleIds = before.roleIds;
    if (changes.roleIds !== undefined) {
      roleIds = await requireRoles(changes.roleIds, tx);
      await roleRepository.setStaffRoles(id, roleIds, tx);
    }
    if (nextStatus === "disabled") {
      await staffSessionRepository.revokeAllForStaff(
        id,
        new Date(),
        undefined,
        tx,
      );
    }

    const updated = (await staffRepository.findById(id, tx))!;
    await recordAudit(
      tx,
      ctx.actor,
      {
        action: "staff.update",
        entityType: "staff",
        entityId: id,
        before,
        after: {
          firstName: updated.firstName,
          lastName: updated.lastName,
          status: updated.status,
          isSuperAdmin: updated.isSuperAdmin,
          roleIds,
        },
      },
      ctx.requestId,
    );
    return dtoFor(updated, tx);
  });
}

/** For a lost phone and lost recovery codes: removes the authenticator so the person sets up a new one at their next sign-in. */
export async function resetTwoFactor(
  ctx: AdminContext,
  id: string,
): Promise<StaffDto> {
  return withTransaction(async (tx) => {
    const staff = await staffRepository.lockById(id, tx);
    if (!staff) throw notFound();

    await staffRepository.clearTotp(id, tx);
    await staffRecoveryCodeRepository.deleteAll(id, tx);
    await staffSessionRepository.revokeAllForStaff(
      id,
      new Date(),
      undefined,
      tx,
    );
    await recordAudit(
      tx,
      ctx.actor,
      {
        action: "staff.two_factor_reset",
        entityType: "staff",
        entityId: id,
        before: { twoFactorEnabled: staff.totpEnabledAt !== null },
        after: { twoFactorEnabled: false },
      },
      ctx.requestId,
    );
    return dtoFor((await staffRepository.findById(id, tx))!, tx);
  });
}

// ---------------------------------------------------------------- roles

/** Names that are not permissions are refused, so a typo never creates a role that silently allows nothing. */
function requirePermissions(names: string[]): Permission[] {
  const unknown = names.filter((name) => !isPermission(name));
  if (unknown.length > 0) {
    throw new ApiError("validation_failed", {
      fields: { permissions: `Unknown permission: ${unknown[0]}` },
    });
  }
  return normalizePermissions(names);
}

const roleNameTaken = () =>
  new ApiError("conflict", {
    message: "A role with this name already exists.",
    fields: { name: "A role with this name already exists" },
  });

export async function listRoles(): Promise<RoleDto[]> {
  return (await roleRepository.list()).map(toRoleDto);
}

export async function createRole(
  ctx: AdminContext,
  input: { name: string; description: string; permissions: string[] },
): Promise<RoleDto> {
  const permissions = requirePermissions(input.permissions);
  try {
    return await withTransaction(async (tx) => {
      const role = await roleRepository.create({ ...input, permissions }, tx);
      await recordAudit(
        tx,
        ctx.actor,
        {
          action: "roles.create",
          entityType: "role",
          entityId: role.id,
          after: {
            name: role.name,
            description: role.description,
            permissions,
          },
        },
        ctx.requestId,
      );
      return toRoleDto(role);
    });
  } catch (error) {
    if (error instanceof RoleNameTakenError) throw roleNameTaken();
    throw error;
  }
}

export async function updateRole(
  ctx: AdminContext,
  id: string,
  changes: { name?: string; description?: string; permissions?: string[] },
): Promise<RoleDto> {
  const permissions =
    changes.permissions === undefined
      ? undefined
      : requirePermissions(changes.permissions);
  try {
    return await withTransaction(async (tx) => {
      const before = await roleRepository.findById(id, tx);
      if (!before) throw notFound();

      await roleRepository.update(id, { ...changes, permissions }, tx);
      const after = (await roleRepository.findById(id, tx))!;
      await recordAudit(
        tx,
        ctx.actor,
        {
          action: "roles.update",
          entityType: "role",
          entityId: id,
          before: {
            name: before.name,
            description: before.description,
            permissions: before.permissions,
          },
          after: {
            name: after.name,
            description: after.description,
            permissions: after.permissions,
          },
        },
        ctx.requestId,
      );
      return toRoleDto(after);
    });
  } catch (error) {
    if (error instanceof RoleNameTakenError) throw roleNameTaken();
    throw error;
  }
}

export async function deleteRole(ctx: AdminContext, id: string): Promise<void> {
  await withTransaction(async (tx) => {
    const role = await roleRepository.findById(id, tx);
    if (!role) throw notFound();
    if (role.staffCount > 0) {
      throw new ApiError("conflict", {
        message:
          "This role is still given to staff. Remove it from them first.",
      });
    }
    await roleRepository.delete(id, tx);
    await recordAudit(
      tx,
      ctx.actor,
      {
        action: "roles.delete",
        entityType: "role",
        entityId: id,
        before: {
          name: role.name,
          description: role.description,
          permissions: role.permissions,
        },
      },
      ctx.requestId,
    );
  });
}
