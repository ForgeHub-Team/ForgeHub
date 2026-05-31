import { useForm } from "react-hook-form";
import { dashboardApi } from "../../api/dashboardApi";
import { useApi } from "../../hooks/useApi";
import { roleIds } from "../../utils/constants";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";

export interface UserFormValues { fullName: string; email: string; phone?: string; password?: string; roleId: number; branchId?: number; gymId?: number; }

export function UserForm({ onSubmit, saving = false }: { onSubmit: (values: UserFormValues) => Promise<void> | void; saving?: boolean }) {
  const workspace = useApi(dashboardApi.getWorkspace, []);
  const { register, handleSubmit } = useForm<UserFormValues>({ defaultValues: { roleId: roleIds.Staff } });
  return (
    <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
      <label>Full name<Input {...register("fullName", { required: true })} /></label>
      <label>Email<Input type="email" {...register("email", { required: true })} /></label>
      <label>Phone<Input {...register("phone")} /></label>
      <label>Password<Input type="password" {...register("password", { required: true })} /></label>
      <label>Role<Select {...register("roleId", { valueAsNumber: true })}>{Object.entries(roleIds).map(([role, id]) => <option key={role} value={id}>{role}</option>)}</Select></label>
      <label>Gym<Select {...register("gymId", { valueAsNumber: true })}><option value="">Scoped automatically</option>{workspace.data?.gyms.map((gym) => <option key={gym.id} value={gym.id}>{gym.name}</option>)}</Select></label>
      <label>Branch<Select {...register("branchId", { valueAsNumber: true })}><option value="">Scoped automatically</option>{workspace.data?.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</Select></label>
      {workspace.error ? <p className="text-sm text-red-600 md:col-span-2">{workspace.error}</p> : null}
      <div className="md:col-span-2"><Button disabled={saving}>{saving ? "Saving..." : "Save user"}</Button></div>
    </form>
  );
}
