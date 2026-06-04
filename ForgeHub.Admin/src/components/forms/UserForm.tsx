import { useState } from "react";
import { useForm } from "react-hook-form";
import { dashboardApi } from "../../api/dashboardApi";
import { useApi } from "../../hooks/useApi";
import { roleIds, roleLabels } from "../../utils/constants";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";

export interface UserFormValues { fullName: string; email: string; phone?: string; password?: string; roleId: number; branchId?: number; gymId?: number; }

export function UserForm({
  onSubmit,
  saving = false,
  fixedRoleId
}: {
  onSubmit: (values: UserFormValues) => Promise<void> | void;
  saving?: boolean;
  fixedRoleId?: number;
}) {
  const workspace = useApi(dashboardApi.getWorkspace, []);
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<"fullName" | "email" | "password", string>>>({});
  const defaultRoleId = fixedRoleId ?? roleIds.Staff;
  const { register, handleSubmit } = useForm<UserFormValues>({ defaultValues: { roleId: defaultRoleId } });

  async function submit(values: UserFormValues) {
    const nextFieldErrors: Partial<Record<"fullName" | "email" | "password", string>> = {};
    if (!values.fullName?.trim()) nextFieldErrors.fullName = "Full name is required.";
    if (!values.email?.trim()) nextFieldErrors.email = "Email is required.";
    if (!values.password?.trim()) nextFieldErrors.password = "Password is required.";

    if (Object.keys(nextFieldErrors).length) {
      setFieldErrors(nextFieldErrors);
      return;
    }

    const payload: UserFormValues = {
      ...values,
      roleId: fixedRoleId ?? values.roleId,
      gymId: values.gymId === 0 ? undefined : values.gymId,
      branchId: values.branchId === 0 ? undefined : values.branchId
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
      <label>Password<Input type="password" {...register("password", { required: true })} /></label>
      {fieldErrors.password ? <p className="text-sm font-semibold text-red-600 md:col-span-2">{fieldErrors.password}</p> : null}
      {fixedRoleId ? (
        <>
          <input type="hidden" {...register("roleId", { valueAsNumber: true })} />
          <div className="rounded-lg border border-forge-border bg-slate-50 px-3 py-2 text-sm md:col-span-2">
            <span className="text-forge-muted">Role fixed to</span> <span className="font-semibold text-slate-900">{roleLabels.GymOwner}</span>
          </div>
        </>
      ) : (
        <label>Role<Select {...register("roleId", { valueAsNumber: true })}>{Object.entries(roleIds).map(([role, id]) => <option key={role} value={id}>{role}</option>)}</Select></label>
      )}
      <label>Gym<Select {...register("gymId", { valueAsNumber: true })}><option value="">Scoped automatically</option>{workspace.data?.gyms.map((gym) => <option key={gym.id} value={gym.id}>{gym.name}</option>)}</Select></label>
      <label>Branch<Select {...register("branchId", { valueAsNumber: true })}><option value="">Scoped automatically</option>{workspace.data?.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</Select></label>
      {workspace.error ? <p className="text-sm text-red-600 md:col-span-2">{workspace.error}</p> : null}
      {submitError ? <p className="text-sm font-semibold text-red-600 md:col-span-2">{submitError}</p> : null}
      <div className="md:col-span-2"><Button disabled={saving || submitting}>{saving || submitting ? "Saving..." : "Save user"}</Button></div>
    </form>
  );
}
