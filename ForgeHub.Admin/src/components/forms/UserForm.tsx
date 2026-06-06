import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { dashboardApi, type AdminWorkspace } from "../../api/dashboardApi";
import { roleIds, roleLabels } from "../../utils/constants";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";

export interface UserFormValues { fullName: string; email: string; phone?: string; password?: string; roleId: number; branchId?: number; gymId?: number; isActive?: boolean; }

let cachedWorkspace: AdminWorkspace | null = null;
let pendingWorkspace: Promise<AdminWorkspace> | null = null;

function loadWorkspaceOptions(force = false) {
  if (!force && cachedWorkspace) return Promise.resolve(cachedWorkspace);
  if (!force && pendingWorkspace) return pendingWorkspace;

  pendingWorkspace = dashboardApi.getWorkspace()
    .then((workspace) => {
      cachedWorkspace = workspace;
      return workspace;
    })
    .finally(() => {
      pendingWorkspace = null;
    });

  return pendingWorkspace;
}

export function UserForm({
  onSubmit,
  saving = false,
  fixedRoleId,
  allowedRoleIds,
  initialValues,
  requirePassword = true,
  submitLabel = "Save user"
}: {
  onSubmit: (values: UserFormValues) => Promise<void> | void;
  saving?: boolean;
  fixedRoleId?: number;
  allowedRoleIds?: number[];
  initialValues?: Partial<UserFormValues>;
  requirePassword?: boolean;
  submitLabel?: string;
}) {
  const [workspace, setWorkspace] = useState<AdminWorkspace | null>(cachedWorkspace);
  const [workspaceLoading, setWorkspaceLoading] = useState(!cachedWorkspace);
  const [workspaceError, setWorkspaceError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<"fullName" | "email" | "password", string>>>({});
  const defaultRoleId = fixedRoleId ?? initialValues?.roleId ?? roleIds.Staff;
  const { register, handleSubmit } = useForm<UserFormValues>({ defaultValues: { ...initialValues, roleId: defaultRoleId } });
  const [selectedGymId, setSelectedGymId] = useState<number | undefined>(initialValues?.gymId);
  const [selectedBranchId, setSelectedBranchId] = useState<number | undefined>(initialValues?.branchId);
  const branchOptions = selectedGymId
    ? workspace?.branches.filter((branch) => branch.gymId === selectedGymId) ?? []
    : [];
  const roleOptions = Object.entries(roleIds).filter(([, id]) => !allowedRoleIds || allowedRoleIds.includes(id));
  const fixedRoleLabel = Object.entries(roleIds).find(([, id]) => id === fixedRoleId)?.[0] ?? "Staff";

  async function loadOptions(force = false) {
    setWorkspaceLoading(true);
    setWorkspaceError("");
    try {
      setWorkspace(await loadWorkspaceOptions(force));
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : "Unable to load gyms and branches.");
    } finally {
      setWorkspaceLoading(false);
    }
  }

  useEffect(() => {
    void loadOptions();
  }, []);

  useEffect(() => {
    if (!selectedGymId && workspace?.gyms.length === 1) {
      setSelectedGymId(workspace.gyms[0].id);
    }
  }, [selectedGymId, workspace]);

  async function submit(values: UserFormValues) {
    const nextFieldErrors: Partial<Record<"fullName" | "email" | "password", string>> = {};
    if (!values.fullName?.trim()) nextFieldErrors.fullName = "Full name is required.";
    if (!values.email?.trim()) nextFieldErrors.email = "Email is required.";
    if (requirePassword && !values.password?.trim()) nextFieldErrors.password = "Password is required.";

    if (Object.keys(nextFieldErrors).length) {
      setFieldErrors(nextFieldErrors);
      return;
    }

    const payload: UserFormValues = {
      ...values,
      roleId: fixedRoleId ?? values.roleId,
      gymId: selectedGymId,
      branchId: selectedBranchId,
      isActive: values.isActive
    };

    setFieldErrors({});
    setSubmitError("");
    setSubmitting(true);
    try {
      await onSubmit(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to save user.";
      console.error("[UserForm] submit failed", error);
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="grid gap-4 md:grid-cols-2" noValidate onSubmit={handleSubmit(submit)}>
      <label>Full name<Input {...register("fullName", { required: true })} /></label>
      {fieldErrors.fullName ? <p className="text-sm font-semibold text-red-600 md:col-span-2">{fieldErrors.fullName}</p> : null}
      <label>Email<Input type="email" {...register("email", { required: true })} /></label>
      {fieldErrors.email ? <p className="text-sm font-semibold text-red-600 md:col-span-2">{fieldErrors.email}</p> : null}
      <label>Phone<Input {...register("phone")} /></label>
      {requirePassword ? (
        <>
          <label>Password<Input type="password" {...register("password", { required: true })} /></label>
          {fieldErrors.password ? <p className="text-sm font-semibold text-red-600 md:col-span-2">{fieldErrors.password}</p> : null}
        </>
      ) : null}
      {fixedRoleId ? (
        <>
          <input type="hidden" {...register("roleId", { valueAsNumber: true })} />
          <div className="rounded-lg border border-forge-border bg-slate-50 px-3 py-2 text-sm md:col-span-2">
            <span className="text-forge-muted">Role fixed to</span> <span className="font-semibold text-slate-900">{roleLabels[fixedRoleLabel as keyof typeof roleLabels]}</span>
          </div>
        </>
      ) : (
        <label>Role<Select {...register("roleId", { valueAsNumber: true })}>{roleOptions.map(([role, id]) => <option key={role} value={id}>{roleLabels[role as keyof typeof roleLabels]}</option>)}</Select></label>
      )}
      <label>Gym<Select name="gymId" data-value-as-number="true" value={selectedGymId ?? ""} disabled={workspaceLoading || Boolean(workspaceError)} onChange={(event) => {
        const nextGymId = event.target.value ? Number(event.target.value) : undefined;
        setSelectedGymId(nextGymId);
        setSelectedBranchId(undefined);
      }}><option value="">{workspaceLoading ? "Loading gyms..." : "Scoped automatically"}</option>{workspace?.gyms.map((gym) => <option key={gym.id} value={gym.id}>{gym.name}</option>)}</Select></label>
      <label>Branch<Select name="branchId" data-value-as-number="true" value={selectedBranchId ?? ""} onChange={(event) => setSelectedBranchId(event.target.value ? Number(event.target.value) : undefined)} disabled={workspaceLoading || Boolean(workspaceError) || !selectedGymId}><option value="">{workspaceLoading ? "Loading branches..." : selectedGymId ? "Scoped automatically" : "Select a gym first"}</option>{branchOptions.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</Select></label>
      {workspaceError ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700 md:col-span-2">
          <span>{workspaceError}</span>
          <Button type="button" variant="secondary" onClick={() => void loadOptions(true)} disabled={workspaceLoading}>Retry</Button>
        </div>
      ) : null}
      {submitError ? <p className="text-sm font-semibold text-red-600 md:col-span-2">{submitError}</p> : null}
      <div className="md:col-span-2"><Button disabled={saving || submitting}>{saving || submitting ? "Saving..." : submitLabel}</Button></div>
    </form>
  );
}
