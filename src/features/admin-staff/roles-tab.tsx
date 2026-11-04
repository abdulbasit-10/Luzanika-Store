"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toaster";
import {
  DetailCard,
  Field,
  FormError,
  fieldError,
  inputClass,
  primaryButton,
} from "@/features/admin-shell/admin-ui";
import { cn } from "@/utils/cn";

import {
  createRole,
  deleteRole,
  fetchPermissions,
  fetchRoles,
  updateRole,
  type PermissionInfo,
  type Role,
} from "./admin-staff-service";
import { groupPermissions, roleProblems } from "./staff-forms";

const GROUP_LABEL: Record<string, string> = {
  dashboard: "Dashboard",
  orders: "Orders",
  payments: "Payments",
  products: "Products",
  catalog: "Catalogue",
  stock: "Inventory",
  customers: "Customers",
  reviews: "Reviews",
  settings: "Settings",
};

function useRoleChange(
  run: () => Promise<unknown>,
  message: string,
  onDone: () => void,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSuccess: async () => {
      toast.success(message);
      onDone();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "roles"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "staff"] }),
      ]);
    },
  });
}

/** Make a role or change one. A change takes effect at once for everyone who holds it. */
function RoleDialog({
  role,
  permissions,
  onClose,
}: {
  role: Role | null;
  permissions: PermissionInfo[];
  onClose: () => void;
}) {
  const [values, setValues] = useState({
    name: role?.name ?? "",
    description: role?.description ?? "",
  });
  const [selected, setSelected] = useState<string[]>(role?.permissions ?? []);
  const [shown, setShown] = useState(false);
  const problems = roleProblems(values, selected);

  const save = useRoleChange(
    () => {
      const body = {
        name: values.name.trim(),
        description: values.description.trim(),
        permissions: selected,
      };
      return role ? updateRole(role.id, body) : createRole(body);
    },
    role ? "Role saved" : "Role created",
    onClose,
  );

  const toggle = (name: string, on: boolean) =>
    setSelected((current) =>
      on ? [...current, name] : current.filter((item) => item !== name),
    );

  return (
    <ConfirmDialog
      open
      onClose={onClose}
      onConfirm={() => {
        setShown(true);
        if (Object.keys(problems).length === 0) save.mutate();
      }}
      title={role ? `Change role “${role.name}”` : "New role"}
      description="Tick what people with this role may do. Managing staff and the audit log are for super admins only."
      confirmLabel={role ? "Save role" : "Create role"}
      pendingLabel="Saving…"
      pending={save.isPending}
    >
      <div className="flex max-h-[min(60dvh,28rem)] flex-col gap-3 overflow-y-auto pr-1">
        <Field
          id="r-name"
          label="Name"
          error={shown ? problems.name : fieldError(save.error, "name")}
        >
          <input
            id="r-name"
            value={values.name}
            onChange={(e) => setValues({ ...values, name: e.target.value })}
            maxLength={60}
            placeholder="e.g. Packer"
            aria-describedby="r-name-error"
            className={inputClass}
          />
        </Field>
        <Field
          id="r-desc"
          label="What it is for (optional)"
          error={shown ? problems.description : undefined}
        >
          <input
            id="r-desc"
            value={values.description}
            onChange={(e) =>
              setValues({ ...values, description: e.target.value })
            }
            maxLength={300}
            aria-describedby="r-desc-error"
            className={inputClass}
          />
        </Field>
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium text-foreground">
            Permissions
          </legend>
          {groupPermissions(permissions).map(({ group, items }) => (
            <div key={group}>
              <p className="text-xs font-semibold text-muted-foreground uppercase">
                {GROUP_LABEL[group] ?? group}
              </p>
              <ul className="mt-1 flex flex-col gap-1">
                {items.map((permission) => (
                  <li key={permission.name}>
                    <Checkbox
                      label={permission.description}
                      checked={selected.includes(permission.name)}
                      onChange={(event) =>
                        toggle(permission.name, event.target.checked)
                      }
                      className="text-foreground"
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {shown && problems.permissions ? (
            <p role="alert" className="text-xs text-danger">
              {problems.permissions}
            </p>
          ) : null}
        </fieldset>
        <FormError error={save.error} />
      </div>
    </ConfirmDialog>
  );
}

function DeleteRoleDialog({
  role,
  onClose,
}: {
  role: Role;
  onClose: () => void;
}) {
  const remove = useRoleChange(
    () => deleteRole(role.id),
    "Role deleted",
    onClose,
  );
  return (
    <ConfirmDialog
      open
      onClose={onClose}
      onConfirm={() => remove.mutate()}
      title={`Delete role “${role.name}”?`}
      description={
        role.staffCount > 0
          ? `${role.staffCount} ${role.staffCount === 1 ? "person still has" : "people still have"} this role. Take it from them first.`
          : "Nobody has this role. This cannot be undone."
      }
      confirmLabel="Delete role"
      pendingLabel="Deleting…"
      pending={remove.isPending}
      confirmDisabled={role.staffCount > 0}
    >
      <FormError error={remove.error} />
    </ConfirmDialog>
  );
}

/** The roles a super admin hands out to staff. */
export function RolesTab() {
  const roles = useQuery({
    queryKey: ["admin", "roles"],
    queryFn: fetchRoles,
    staleTime: 10_000,
  });
  const permissions = useQuery({
    queryKey: ["admin", "permissions"],
    queryFn: fetchPermissions,
    staleTime: 5 * 60_000,
  });
  const [dialog, setDialog] = useState<
    { kind: "edit"; role: Role | null } | { kind: "delete"; role: Role } | null
  >(null);

  if (roles.isPending || permissions.isPending)
    return (
      <p role="status" className="text-sm text-muted-foreground">
        Loading roles…
      </p>
    );
  if (roles.isError || permissions.isError)
    return (
      <p role="alert" className="text-sm text-danger">
        We couldn&apos;t load the roles. Check your connection and reload.
      </p>
    );

  const textButton =
    "text-sm font-medium text-accent underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

  return (
    <>
      <div>
        <button
          type="button"
          onClick={() => setDialog({ kind: "edit", role: null })}
          className={primaryButton}
        >
          <Plus aria-hidden className="size-4" />
          New role
        </button>
      </div>
      {roles.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No roles yet. A role is a set of ticked permissions, such as “Packer”
          or “Support”, that you give to staff.
        </p>
      ) : (
        <ul className="grid gap-[clamp(0.5rem,1.6dvh,1.25rem)] md:grid-cols-2">
          {roles.data.map((role) => (
            <li key={role.id}>
              <DetailCard
                title={role.name}
                action={
                  <span className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setDialog({ kind: "edit", role })}
                      className={textButton}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDialog({ kind: "delete", role })}
                      className={cn(textButton, "text-danger")}
                    >
                      Delete
                    </button>
                  </span>
                }
              >
                {role.description ? (
                  <p className="mb-2 text-sm text-muted-foreground">
                    {role.description}
                  </p>
                ) : null}
                <p className="text-sm text-foreground">
                  {role.permissions.length}{" "}
                  {role.permissions.length === 1 ? "permission" : "permissions"}
                  {" · "}
                  {role.staffCount}{" "}
                  {role.staffCount === 1 ? "person" : "people"}
                </p>
              </DetailCard>
            </li>
          ))}
        </ul>
      )}
      {dialog?.kind === "edit" ? (
        <RoleDialog
          role={dialog.role}
          permissions={permissions.data}
          onClose={() => setDialog(null)}
        />
      ) : null}
      {dialog?.kind === "delete" ? (
        <DeleteRoleDialog role={dialog.role} onClose={() => setDialog(null)} />
      ) : null}
    </>
  );
}
