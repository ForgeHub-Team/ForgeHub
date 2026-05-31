import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { branchesApi } from "../../api/branchesApi";
import type { Branch } from "../../types/branch";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";

export interface MembershipPlanFormValues {
  name: string;
  price?: number;
  durationMonths?: number;
  accessType?: string;
  includesClasses?: boolean;
  includesPt?: boolean;
  isActive?: boolean;
  branchIds?: number[];
}

export function MembershipPlanForm({
  initialValues,
  onSubmit,
  saving = false
}: {
  initialValues?: Partial<MembershipPlanFormValues>;
  onSubmit: (values: MembershipPlanFormValues) => Promise<void> | void;
  saving?: boolean;
}) {
  const { register, handleSubmit } = useForm<MembershipPlanFormValues>({
    defaultValues: initialValues
  });
  const [branches, setBranches] = useState<Branch[]>([]);

  useEffect(() => {
    branchesApi.getBranches().then(setBranches).catch(() => setBranches([]));
  }, []);

  return (
    <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit((values) => onSubmit({ ...values, branchIds: values.branchIds?.map(Number) }))}>
      <label>Name<Input {...register("name", { required: true })} /></label>
      <label>Price<Input type="number" {...register("price", { valueAsNumber: true })} /></label>
      <label>Duration months<Input type="number" {...register("durationMonths", { valueAsNumber: true })} /></label>
      <label>Access type<Input {...register("accessType")} /></label>
      <label className="flex gap-2"><input type="checkbox" {...register("includesClasses")} /> Includes classes</label>
      <label className="flex gap-2"><input type="checkbox" {...register("includesPt")} /> Includes PT</label>
      <fieldset className="md:col-span-2 rounded-xl border border-forge-border p-3">
        <legend className="px-1 text-sm font-bold">Allowed branches</legend>
        <div className="grid gap-2 md:grid-cols-2">
          {branches.map((branch) => (
            <label key={branch.id} className="flex items-center gap-2 rounded-lg bg-slate-50 p-2 text-sm">
              <input
                type="checkbox"
                value={branch.id}
                {...register("branchIds")}
                defaultChecked={initialValues?.branchIds?.includes(branch.id)}
              />
              {branch.name}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex gap-2"><input type="checkbox" {...register("isActive")} defaultChecked={initialValues?.isActive ?? true} /> Active</label>
      <div className="md:col-span-2"><Button disabled={saving}>Save plan</Button></div>
    </form>
  );
}
