import { usersApi } from "../../api/usersApi";
import { UserForm } from "../../components/forms/UserForm";
import { Button } from "../../components/ui/Button";
import { DataTable } from "../../components/ui/DataTable";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingState } from "../../components/ui/LoadingState";
import { Modal } from "../../components/ui/Modal";
import { PageHeader } from "../../components/ui/PageHeader";
import { Select } from "../../components/ui/Select";
import { useApi } from "../../hooks/useApi";
import type { User } from "../../types/user";
import { roleIds, roleLabels } from "../../utils/constants";
import { useMemo, useState } from "react";

const columns = [
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "role", label: "Role", badge: true },
  { key: "workspace", label: "Workspace" },
  { key: "isActive", label: "Active", badge: true }
];

function escapeCell(value: unknown) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function exportUsers(rows: User[]) {
  const headers = ["Name", "Email", "Phone", "Role", "Workspace", "Active"];
  const body = rows.map((user) => [
    user.name ?? user.fullName ?? "",
    user.email ?? "",
    user.phone ?? "",
    typeof user.role === "string" ? user.role : "",
    user.workspace ?? "",
    user.isActive ? "Yes" : "No"
  ]);
  const html = `<table><thead><tr>${headers.map((header) => `<th>${escapeCell(header)}</th>`).join("")}</tr></thead><tbody>${body.map((row) => `<tr>${row.map((cell) => `<td>${escapeCell(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  const blob = new Blob([html], { type: "application/vnd.ms-excel" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "platform-users.xls";
  link.click();
  URL.revokeObjectURL(url);
}

export function PlatformUsersPage() {
  const [roleFilter, setRoleFilter] = useState("");
  const [open, setOpen] = useState(false);
  const roleId = roleFilter ? Number(roleFilter) : undefined;
  const { data, loading, error, reload } = useApi(() => usersApi.getUsers(roleId ? { roleId } : undefined), [roleId]);
  const rows = useMemo(() => data ?? [], [data]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <>
      <PageHeader title="Platform Users" description="All scoped admin users returned by the backend." />
      <DataTable<User>
        title="Platform Users"
        rows={rows}
        columns={columns}
        createLabel="Create user"
        onCreate={() => setOpen(true)}
        toolbar={(
          <>
            <Select className="min-w-40" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
              <option value="">All roles</option>
              {Object.entries(roleIds).map(([role, id]) => <option key={role} value={id}>{roleLabels[role as keyof typeof roleLabels]}</option>)}
            </Select>
            <Button type="button" variant="secondary" onClick={() => exportUsers(rows)}>Export Excel</Button>
          </>
        )}
      />
      <Modal open={open} title="Create user" onClose={() => setOpen(false)}>
        <UserForm onSubmit={async (v) => { await usersApi.createUser(v); setOpen(false); await reload(); }} />
      </Modal>
    </>
  );
}
