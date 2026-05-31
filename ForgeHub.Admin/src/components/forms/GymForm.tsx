import { useForm } from "react-hook-form";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";

export interface GymFormValues { name: string; city?: string; logoUrl?: string; ownerUserId?: number; }

export function GymForm({ initialValues, onSubmit, saving = false }: { initialValues?: Partial<GymFormValues>; onSubmit: (values: GymFormValues) => Promise<void> | void; saving?: boolean }) {
  const { register, handleSubmit } = useForm<GymFormValues>({ defaultValues: initialValues });
  return <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}><label>Name<Input {...register("name", { required: true })} /></label><label>City<Input {...register("city")} /></label><label>Logo URL<Input {...register("logoUrl")} /></label><Button disabled={saving}>Save gym</Button></form>;
}
