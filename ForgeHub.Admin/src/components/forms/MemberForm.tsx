import { useForm } from "react-hook-form";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import type { Branch } from "../../types/branch";

export interface MemberFormValues {
  fullName: string;
  gender?: string;
  dob?: string;
  phone?: string;
  email?: string;
  password?: string;
  homeBranchId?: number;
}

export function MemberForm({ branches = [], initialValues, onSubmit, saving = false, requirePassword = false }: { branches?: Branch[]; initialValues?: Partial<MemberFormValues>; onSubmit: (values: MemberFormValues) => Promise<void> | void; saving?: boolean; requirePassword?: boolean }) {
  const { register, handleSubmit, formState: { errors } } = useForm<MemberFormValues>({ defaultValues: initialValues });
  return (
    <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
      <label className="md:col-span-2">Full name<Input {...register("fullName", { required: "Full name is required." })} /></label>
      {errors.fullName ? <p className="text-sm text-red-600 md:col-span-2">{errors.fullName.message}</p> : null}
      <label>Gender<Select {...register("gender")}><option value="">Select</option><option>Male</option><option>Female</option><option>Other</option></Select></label>
      <label>Date of birth<Input type="date" {...register("dob")} /></label>
      <label>Phone<Input {...register("phone")} /></label>
      <label>Email<Input type="email" {...register("email", requirePassword ? { required: "Email is required." } : undefined)} /></label>
      {errors.email ? <p className="text-sm text-red-600 md:col-span-2">{errors.email.message}</p> : null}
      {requirePassword ? (
        <label className="md:col-span-2">Password<Input type="password" autoComplete="new-password" {...register("password", { required: "Password is required." })} /></label>
      ) : null}
      {errors.password ? <p className="text-sm text-red-600 md:col-span-2">{errors.password.message}</p> : null}
      <label className="md:col-span-2">Home branch<Select {...register("homeBranchId", { valueAsNumber: true })}><option value="">Use my branch</option>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select></label>
      <div className="md:col-span-2"><Button disabled={saving}>{saving ? "Saving..." : "Save member"}</Button></div>
    </form>
  );
}
