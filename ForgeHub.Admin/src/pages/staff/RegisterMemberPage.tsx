import { useState } from "react";
import { adminWorkflowsApi } from "../../api/adminWorkflowsApi";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { ErrorState } from "../../components/ui/ErrorState";
import { Input } from "../../components/ui/Input";
import { LoadingState } from "../../components/ui/LoadingState";
import { PageHeader } from "../../components/ui/PageHeader";
import { Select } from "../../components/ui/Select";
import { Textarea } from "../../components/ui/Textarea";
import { useApi } from "../../hooks/useApi";

export function RegisterMemberPage() {
  const options = useApi(adminWorkflowsApi.getMemberOnboardingOptions, []);
  const [form, setForm] = useState({
    fullName: "",
    gender: "",
    dob: "",
    phone: "",
    email: "",
    homeBranchId: "",
    membershipPlanId: "",
    startDate: new Date().toISOString().slice(0, 10),
    trainerUserId: "",
    paymentAmount: "",
    paymentMethod: "Card",
    notes: ""
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  if (options.loading) return <LoadingState />;
  if (options.error) return <ErrorState message={options.error} />;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      if (!form.homeBranchId || !form.membershipPlanId) {
        throw new Error("Home branch and membership plan are required.");
      }

      const result = await adminWorkflowsApi.createMemberOnboarding({
        fullName: form.fullName,
        gender: form.gender || undefined,
        dob: form.dob || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        homeBranchId: Number(form.homeBranchId),
        membershipPlanId: Number(form.membershipPlanId),
        startDate: form.startDate,
        trainerUserId: form.trainerUserId ? Number(form.trainerUserId) : undefined,
        paymentAmount: form.paymentAmount ? Number(form.paymentAmount) : undefined,
        paymentMethod: form.paymentMethod,
        notes: form.notes || undefined
      });

      setMessage(`${result.fullName} was saved with membership ${result.membershipStatus}.`);
      setForm((current) => ({
        ...current,
        fullName: "",
        gender: "",
        dob: "",
        phone: "",
        email: "",
        trainerUserId: "",
        paymentAmount: "",
        notes: ""
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to register member.");
    } finally {
      setSaving(false);
    }
  }

  const update = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }));

  return (
    <>
      <PageHeader title="Register Member" description="Creates a member, membership, and optional payment through real backend API calls." />
      <Card>
        <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
          <label className="md:col-span-2">Full name<Input required value={form.fullName} onChange={(e) => update("fullName", e.target.value)} /></label>
          <label>Gender<Select value={form.gender} onChange={(e) => update("gender", e.target.value)}><option value="">Select</option><option>Male</option><option>Female</option><option>Other</option></Select></label>
          <label>Date of birth<Input type="date" value={form.dob} onChange={(e) => update("dob", e.target.value)} /></label>
          <label>Phone<Input value={form.phone} onChange={(e) => update("phone", e.target.value)} /></label>
          <label>Email<Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} /></label>
          <label>Home branch<Select required value={form.homeBranchId} onChange={(e) => update("homeBranchId", e.target.value)}><option value="">Assigned branch</option>{options.data?.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</Select></label>
          <label>Membership plan<Select required value={form.membershipPlanId} onChange={(e) => update("membershipPlanId", e.target.value)}><option value="">Select plan</option>{options.data?.membershipPlans.filter((plan) => !form.homeBranchId || plan.gymId === options.data?.branches.find((branch) => branch.id === Number(form.homeBranchId))?.gymId).map((plan) => <option key={plan.id} value={plan.id}>{plan.name}{plan.price ? ` - $${plan.price}` : ""}</option>)}</Select></label>
          <label>Start date<Input type="date" value={form.startDate} onChange={(e) => update("startDate", e.target.value)} /></label>
          <label>Trainer<Select value={form.trainerUserId} onChange={(e) => update("trainerUserId", e.target.value)}><option value="">No trainer assignment</option>{options.data?.trainers.filter((trainer) => !form.homeBranchId || trainer.branchId === Number(form.homeBranchId)).map((trainer) => <option key={trainer.id} value={trainer.id}>{trainer.fullName}</option>)}</Select></label>
          <label>Payment amount<Input type="number" value={form.paymentAmount} onChange={(e) => update("paymentAmount", e.target.value)} /></label>
          <label>Payment method<Select value={form.paymentMethod} onChange={(e) => update("paymentMethod", e.target.value)}><option>Card</option><option>Cash</option><option>Transfer</option></Select></label>
          <label className="md:col-span-2">Notes<Textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} /></label>
          {error ? <div className="md:col-span-2"><ErrorState message={error} /></div> : null}
          {message ? <div className="rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-700 md:col-span-2">{message}</div> : null}
          <div className="md:col-span-2"><Button disabled={saving}>{saving ? "Registering..." : "Register member"}</Button></div>
        </form>
      </Card>
    </>
  );
}
