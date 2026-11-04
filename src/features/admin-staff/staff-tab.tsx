"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toaster";
import { dateTimeFormat } from "@/features/admin-orders/order-detail-ui";
import { useAdminSession } from "@/features/admin-shell/admin-session";
import {
  Field,
  FormError,
  SearchBox,
  TableMessage,
  bodyCell,
  fieldError,
  filterBarClass,
  headCell,
  inputClass,
  primaryButton,
  tableCardClass,
  useDebounced,
} from "@/features/admin-shell/admin-ui";
import { cn } from "@/utils/cn";

import {
  fetchRoles,
  fetchStaff,
  inviteStaff,
  resendInvite,
  resetTwoFactor,
  updateStaff,
  type StaffMember,
  type StaffStatus,
} from "./admin-staff-service";
import { personProblems } from "./staff-forms";

const STATUS_STYLE: Record<StaffStatus, string> = {
  active: "border-[#279f51]/10 bg-[#279f51]/10 text-success",
  invited: "border-[#ff9f24]/10 bg-[#ff9f24]/10 text-[#ff9f24]",
  disabled: "border-danger/10 bg-[#feeff2] text-danger",
};
const STATUS_LABEL: Record<StaffStatus, string> = {
  active: "Active",
  invited: "Invited",
  disabled: "Disabled",
};

export const fullName = (person: { firstName: string; lastName: string }) =>
  `${person.firstName} ${person.lastName}`.trim();

function useStaffChange<V>(
  run: (variables: V) => Promise<unknown>,
  message: string | ((result: unknown) => string),
  onDone: () => void,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSuccess: async (result) => {
      const text = typeof message === "string" ? message : message(result);
      toast.success(text);
      onDone();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "staff"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "roles"] }),
      ]);
    },
  });
}

/** Ticks of the roles a person holds. */
function RolePicker({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const roles = useQuery({
    queryKey: ["admin", "roles"],
    queryFn: fetchRoles,
    staleTime: 30_000,
  });
  if (roles.isPending)
    return <p className="text-sm text-muted-foreground">Loading roles…</p>;
  if (!roles.data || roles.data.length === 0)
    return (
      <p className="text-sm text-muted-foreground">
        No roles yet. Make one in the Roles tab first.
      </p>
    );
  return (
    <ul className="grid gap-1.5 sm:grid-cols-2">
      {roles.data.map((role) => (
        <li key={role.id}>
          <Checkbox
            label={role.name}
            checked={selected.includes(role.id)}
            onChange={(event) =>
              onChange(
                event.target.checked
                  ? [...selected, role.id]
                  : selected.filter((id) => id !== role.id),
              )
            }
            className="items-center text-foreground"
          />
        </li>
      ))}
    </ul>
  );
}

function InviteDialog({ onClose }: { onClose: () => void }) {
  const [values, setValues] = useState({
    email: "",
    firstName: "",
    lastName: "",
  });
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [shown, setShown] = useState(false);
  const problems = personProblems(values, true);

  const invite = useStaffChange(
    () =>
      inviteStaff({
        email: values.email.trim(),
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        roleIds,
        isSuperAdmin,
      }),
    (result) =>
      (result as { inviteEmailSent?: boolean }).inviteEmailSent === false
        ? "Person added, but the invite email could not be sent. Use “Resend invite”."
        : "Invite sent",
    onClose,
  );
  const set = (patch: Partial<typeof values>) =>
    setValues((current) => ({ ...current, ...patch }));
  const err = (key: keyof typeof values) =>
    shown ? problems[key] : fieldError(invite.error, key);

  return (
    <ConfirmDialog
      open
      onClose={onClose}
      onConfirm={() => {
        setShown(true);
        if (Object.keys(problems).length === 0) invite.mutate(undefined);
      }}
      title="Invite staff"
      description="They get an email with a link to choose a password, then set up their authenticator app."
      confirmLabel="Send invite"
      pendingLabel="Sending…"
      pending={invite.isPending}
    >
      <div className="flex flex-col gap-3">
        <Field id="i-email" label="Email" error={err("email")}>
          <input
            id="i-email"
            type="email"
            value={values.email}
            onChange={(e) => set({ email: e.target.value })}
            aria-invalid={Boolean(err("email"))}
            aria-describedby="i-email-error"
            className={inputClass}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field id="i-first" label="First name" error={err("firstName")}>
            <input
              id="i-first"
              value={values.firstName}
              onChange={(e) => set({ firstName: e.target.value })}
              aria-describedby="i-first-error"
              className={inputClass}
            />
          </Field>
          <Field id="i-last" label="Last name" error={err("lastName")}>
            <input
              id="i-last"
              value={values.lastName}
              onChange={(e) => set({ lastName: e.target.value })}
              aria-describedby="i-last-error"
              className={inputClass}
            />
          </Field>
        </div>
        <div>
          <p className="mb-1 text-sm font-medium text-foreground">Roles</p>
          <RolePicker selected={roleIds} onChange={setRoleIds} />
        </div>
        <Checkbox
          label="Super admin: can do everything, including managing staff"
          checked={isSuperAdmin}
          onChange={(event) => setIsSuperAdmin(event.target.checked)}
          className="items-center text-foreground"
        />
        <FormError error={invite.error} />
      </div>
    </ConfirmDialog>
  );
}

function EditDialog({
  member,
  isSelf,
  onClose,
}: {
  member: StaffMember;
  isSelf: boolean;
  onClose: () => void;
}) {
  const [values, setValues] = useState({
    firstName: member.firstName,
    lastName: member.lastName,
  });
  const [roleIds, setRoleIds] = useState(member.roles.map((role) => role.id));
  const [isSuperAdmin, setIsSuperAdmin] = useState(member.isSuperAdmin);
  const [shown, setShown] = useState(false);
  const problems = personProblems({ email: "", ...values }, false);

  const save = useStaffChange(
    () =>
      updateStaff(member.id, {
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        roleIds,
        ...(isSelf ? {} : { isSuperAdmin }),
      }),
    "Changes saved",
    onClose,
  );
  const set = (patch: Partial<typeof values>) =>
    setValues((current) => ({ ...current, ...patch }));

  return (
    <ConfirmDialog
      open
      onClose={onClose}
      onConfirm={() => {
        setShown(true);
        if (Object.keys(problems).length === 0) save.mutate(undefined);
      }}
      title={`Change ${fullName(member)}`}
      description={member.email}
      confirmLabel="Save changes"
      pendingLabel="Saving…"
      pending={save.isPending}
    >
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Field
            id="e-first"
            label="First name"
            error={shown ? problems.firstName : undefined}
          >
            <input
              id="e-first"
              value={values.firstName}
              onChange={(e) => set({ firstName: e.target.value })}
              aria-describedby="e-first-error"
              className={inputClass}
            />
          </Field>
          <Field
            id="e-last"
            label="Last name"
            error={shown ? problems.lastName : undefined}
          >
            <input
              id="e-last"
              value={values.lastName}
              onChange={(e) => set({ lastName: e.target.value })}
              aria-describedby="e-last-error"
              className={inputClass}
            />
          </Field>
        </div>
        <div>
          <p className="mb-1 text-sm font-medium text-foreground">Roles</p>
          <RolePicker selected={roleIds} onChange={setRoleIds} />
        </div>
        <Checkbox
          label={
            isSelf
              ? "Super admin (you cannot change your own)"
              : "Super admin: can do everything, including managing staff"
          }
          checked={isSuperAdmin}
          disabled={isSelf}
          onChange={(event) => setIsSuperAdmin(event.target.checked)}
          className="items-center text-foreground"
        />
        <FormError error={save.error} />
      </div>
    </ConfirmDialog>
  );
}

type Confirm = { kind: "disable" | "enable" | "reset2fa"; member: StaffMember };

function ConfirmAction({
  action,
  onClose,
}: {
  action: Confirm;
  onClose: () => void;
}) {
  const { member, kind } = action;
  const run = useStaffChange(
    () =>
      kind === "reset2fa"
        ? resetTwoFactor(member.id)
        : updateStaff(member.id, {
            status: kind === "disable" ? "disabled" : "active",
          }),
    kind === "disable"
      ? "Person disabled"
      : kind === "enable"
        ? "Person enabled"
        : "Authenticator reset",
    onClose,
  );
  const copy = {
    disable: {
      title: `Disable ${fullName(member)}?`,
      description:
        "They are signed out at once and cannot sign in. You can enable them again later.",
      label: "Disable",
    },
    enable: {
      title: `Enable ${fullName(member)}?`,
      description: "They can sign in again.",
      label: "Enable",
    },
    reset2fa: {
      title: `Reset the authenticator of ${fullName(member)}?`,
      description:
        "For a lost phone. Their authenticator and recovery codes are removed and they are signed out. They set up a new one at their next sign-in.",
      label: "Reset authenticator",
    },
  }[kind];

  return (
    <ConfirmDialog
      open
      onClose={onClose}
      onConfirm={() => run.mutate(undefined)}
      title={copy.title}
      description={copy.description}
      confirmLabel={copy.label}
      pendingLabel="Saving…"
      pending={run.isPending}
    >
      <FormError error={run.error} />
    </ConfirmDialog>
  );
}

/** Everyone who works in the admin, with their roles. */
export function StaffTab() {
  const { staff: me } = useAdminSession();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StaffStatus | "">("");
  const [inviting, setInviting] = useState(false);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const settled = useDebounced(search);
  const queryClient = useQueryClient();

  const filters = { search: settled || undefined, status: status || undefined };
  const list = useQuery({
    queryKey: ["admin", "staff", filters],
    queryFn: () => fetchStaff(filters),
    placeholderData: keepPreviousData,
    staleTime: 10_000,
  });
  const rows = list.data ?? [];

  const resend = useMutation({
    mutationFn: (id: string) => resendInvite(id),
    onSuccess: async (result) => {
      if (result.inviteEmailSent) toast.success("Invite sent again");
      else
        toast.error(
          "The invite email could not be sent. Check the mail settings.",
        );
      await queryClient.invalidateQueries({ queryKey: ["admin", "staff"] });
    },
    onError: () => toast.error("We couldn't resend the invite."),
  });

  let message: string | undefined;
  if (list.isError && rows.length === 0)
    message =
      "We couldn't load the staff. Check your connection and try again.";
  else if (list.isPending) message = "Loading staff…";
  else if (rows.length === 0) message = "Nobody matches these filters.";

  const linkButton =
    "text-sm font-medium text-accent underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

  return (
    <>
      <div className={filterBarClass}>
        <div className="flex flex-wrap items-center gap-[clamp(0.5rem,1.1vw,0.85rem)]">
          <SearchBox
            label="Search by name or email"
            placeholder="Search by name or email"
            value={search}
            onChange={setSearch}
            className="min-w-[14rem] flex-1"
          />
          <select
            aria-label="Status"
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as StaffStatus | "")
            }
            className="h-[clamp(2.25rem,5.6dvh,2.7rem)] rounded-[9px] bg-panel px-3.5 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="invited">Invited</option>
            <option value="disabled">Disabled</option>
          </select>
          <button
            type="button"
            onClick={() => setInviting(true)}
            className={primaryButton}
          >
            <Plus aria-hidden className="size-4" />
            Invite staff
          </button>
        </div>
      </div>
      <div
        className={cn(
          tableCardClass,
          list.isFetching && !list.isPending && "opacity-80",
        )}
      >
        <div className="min-h-0 flex-[0_1_auto] overflow-auto">
          <table className="w-full min-w-[52rem] table-fixed border-separate border-spacing-0">
            <colgroup>
              <col className="w-[26%]" />
              <col className="w-[22%]" />
              <col className="w-[12%]" />
              <col className="w-[16%]" />
              <col className="w-[24%]" />
            </colgroup>
            <thead className="sticky top-0 z-10">
              <tr>
                <th scope="col" className={headCell}>
                  Person
                </th>
                <th scope="col" className={headCell}>
                  Roles
                </th>
                <th scope="col" className={headCell}>
                  Status
                </th>
                <th scope="col" className={headCell}>
                  Last sign-in
                </th>
                <th scope="col" className={headCell}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((member) => {
                const isSelf = member.id === me.id;
                return (
                  <tr key={member.id}>
                    <td className={bodyCell}>
                      <span className="block truncate font-medium text-foreground">
                        {fullName(member)}
                        {isSelf ? (
                          <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                            (you)
                          </span>
                        ) : null}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {member.email}
                      </span>
                    </td>
                    <td className={cn(bodyCell, "text-foreground")}>
                      <span className="block truncate">
                        {member.isSuperAdmin
                          ? "Super admin"
                          : member.roles.map((role) => role.name).join(", ") ||
                            "No role"}
                      </span>
                    </td>
                    <td className={bodyCell}>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
                          STATUS_STYLE[member.status],
                        )}
                      >
                        {STATUS_LABEL[member.status]}
                      </span>
                    </td>
                    <td className={cn(bodyCell, "text-xs text-foreground")}>
                      {member.lastLoginAt
                        ? dateTimeFormat.format(new Date(member.lastLoginAt))
                        : "Never"}
                    </td>
                    <td className={bodyCell}>
                      <span className="flex flex-wrap gap-x-3 gap-y-0.5">
                        <button
                          type="button"
                          onClick={() => setEditing(member)}
                          className={linkButton}
                        >
                          Edit
                        </button>
                        {member.status === "invited" ? (
                          <button
                            type="button"
                            disabled={resend.isPending}
                            onClick={() => resend.mutate(member.id)}
                            className={linkButton}
                          >
                            Resend invite
                          </button>
                        ) : null}
                        {member.twoFactorEnabled && !isSelf ? (
                          <button
                            type="button"
                            onClick={() =>
                              setConfirm({ kind: "reset2fa", member })
                            }
                            className={linkButton}
                          >
                            Reset 2FA
                          </button>
                        ) : null}
                        {!isSelf && member.status === "active" ? (
                          <button
                            type="button"
                            onClick={() =>
                              setConfirm({ kind: "disable", member })
                            }
                            className="text-sm font-medium text-danger underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                          >
                            Disable
                          </button>
                        ) : null}
                        {!isSelf && member.status === "disabled" ? (
                          <button
                            type="button"
                            onClick={() =>
                              setConfirm({ kind: "enable", member })
                            }
                            className={linkButton}
                          >
                            Enable
                          </button>
                        ) : null}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {message ? <TableMessage>{message}</TableMessage> : null}
        </div>
      </div>
      {inviting ? <InviteDialog onClose={() => setInviting(false)} /> : null}
      {editing ? (
        <EditDialog
          member={editing}
          isSelf={editing.id === me.id}
          onClose={() => setEditing(null)}
        />
      ) : null}
      {confirm ? (
        <ConfirmAction action={confirm} onClose={() => setConfirm(null)} />
      ) : null}
    </>
  );
}
