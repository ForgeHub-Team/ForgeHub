import { useForm } from "react-hook-form";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import type { Gym } from "../../types/gym";

export interface BranchFormValues { gymId?: number; name: string; address?: string; phone?: string; rangeKm?: number; capacity?: number; areaSqm?: number; lat?: number; lng?: number; openTime?: string; closeTime?: string; isActive?: boolean; }

export function BranchForm({ initialValues, onSubmit, saving = false, gyms = [] }: { initialValues?: Partial<BranchFormValues>; onSubmit: (values: BranchFormValues) => Promise<void> | void; saving?: boolean; gyms?: Gym[] }) {
  const { register, handleSubmit } = useForm<BranchFormValues>({ defaultValues: { ...initialValues, gymId: initialValues?.gymId ?? (gyms.length === 1 ? gyms[0].id : undefined) } });
  return (
    <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
      {gyms.length > 1 ? <label className="md:col-span-2">Gym<Select {...register("gymId", { valueAsNumber: true, required: true })}><option value="">Select gym</option>{gyms.map((gym) => <option key={gym.id} value={gym.id}>{gym.name}</option>)}</Select></label> : null}
      {gyms.length === 1 ? <input type="hidden" value={gyms[0].id} {...register("gymId", { valueAsNumber: true })} /> : null}
      <label className="md:col-span-2">Branch name<Input {...register("name", { required: true })} /></label>
      <label className="md:col-span-2">Address<Input {...register("address")} /></label>
      <label>Phone<Input {...register("phone")} /></label>
      <label>Range KM<Input type="number" step="0.01" {...register("rangeKm", { valueAsNumber: true })} /></label>
      <label>Capacity<Input type="number" {...register("capacity", { valueAsNumber: true })} /></label>
      <label>Area sqm<Input type="number" {...register("areaSqm", { valueAsNumber: true })} /></label>
      <label>Latitude<Input type="number" step="0.000001" {...register("lat", { valueAsNumber: true })} /></label>
      <label>Longitude<Input type="number" step="0.000001" {...register("lng", { valueAsNumber: true })} /></label>
      <label>Open time<Input type="time" {...register("openTime")} /></label>
      <label>Close time<Input type="time" {...register("closeTime")} /></label>
      <label className="flex gap-2"><input type="checkbox" {...register("isActive")} defaultChecked={initialValues?.isActive ?? true} /> Active</label>
      <div className="md:col-span-2"><Button disabled={saving}>Save branch</Button></div>
    </form>
  );
}
