import { useMemo, useState } from "react";
import { checkInsApi } from "../../api/checkInsApi";
import { dashboardApi } from "../../api/dashboardApi";
import { membershipsApi } from "../../api/membershipsApi";
import { paymentsApi } from "../../api/paymentsApi";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { DataTable } from "../../components/ui/DataTable";
import { ErrorState } from "../../components/ui/ErrorState";
import { Input } from "../../components/ui/Input";
import { LoadingState } from "../../components/ui/LoadingState";
import { PageHeader } from "../../components/ui/PageHeader";
import { Select } from "../../components/ui/Select";
import { useApi } from "../../hooks/useApi";
import type { MemberMembership } from "../../types/membership";
import { cleanLabel, dateLabel, money } from "../../utils/formatters";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function isExpiredOrExpiring(endDate?: string | null) {
  if (!endDate) return true;
  const end = new Date(endDate);
  if (Number.isNaN(end.getTime())) return true;
  const now = new Date();
  const daysUntilEnd = Math.ceil((end.getTime() - now.getTime()) / 86400000);
  return daysUntilEnd <= 14;
}

export function RenewMembershipPage() {
  const workspace = useApi(dashboardApi.getWorkspace, []);
  const memberships = useApi(membershipsApi.getExpiringMemberships, []);
  const [memberId, setMemberId] = useState("");
  const [planId, setPlanId] = useState("");
  const [startDate, setStartDate] = useState(todayIso());
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Card");
  const [saving, setSaving] = useState(false);
  const [creatingPass, setCreatingPass] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const members = workspace.data?.members ?? [];
  const plans = workspace.data?.plans ?? [];
  const selectedMember = members.find((member) => String(member.id) === memberId);
  const selectedPlan = plans.find((plan) => String(plan.id) === planId);
  const memberRows = useMemo(
    () => members.filter((member) => isExpiredOrExpiring(member.membershipEndDate)),
    [members]
  );

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      if (!memberId || !planId) {
        throw new Error("Select a member and membership plan.");
      }

      const renewal = await membershipsApi.renewMembership(Number(memberId), {
        planId: Number(planId),
        startDate,
        status: "ACTIVE"
      });

      if (paymentAmount && Number(paymentAmount) > 0) {
        await paymentsApi.createPayment({
          gymId: selectedMember?.gymId ?? selectedPlan?.gymId,
          branchId: selectedMember?.branchId ?? selectedMember?.homeBranchId,
          memberId: Number(memberId),
          membershipId: renewal.id,
          amount: Number(paymentAmount),
          method: paymentMethod,
          notes: `Membership renewal for ${selectedPlan?.name ?? "selected plan"}`
        });
      }

      setMessage(`${cleanLabel(selectedMember?.name ?? selectedMember?.fullName, "Member")} renewed until ${dateLabel(renewal.endDate)}.`);
      setPaymentAmount("");
      await Promise.all([memberships.reload(), workspace.reload()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to renew membership.");
    } finally {
      setSaving(false);
    }
  }

  async function createOneDayPass() {
    setCreatingPass(true);
    setError("");
    setMessage("");
    try {
      const pass = await checkInsApi.createOneDayPass();
      const until = pass.autoCheckOutTime ? new Date(pass.autoCheckOutTime).toLocaleString() : "90 minutes from now";
      setMessage(`${pass.displayName || "One Day Pass"} checked in at ${pass.branchName || "assigned branch"} until ${until}.`);
      await workspace.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create one-day pass.");
    } finally {
      setCreatingPass(false);
    }
  }

  if (workspace.loading || memberships.loading) return <LoadingState />;
  if (workspace.error) return <ErrorState message={workspace.error} />;
  if (memberships.error) return <ErrorState message={memberships.error} />;

  return (
    <div className="space-y-5 pb-24">
      <PageHeader title="Renew Membership" description="Create a new active membership period and optionally record the renewal payment." />

      {message ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{message}</div> : null}
      {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div> : null}

      <Card>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950">One Day Pass</h2>
            <p className="text-sm text-forge-muted">Create a temporary branch visitor and check them in for 1 hour and 30 minutes.</p>
          </div>
          <Button type="button" disabled={creatingPass} onClick={createOneDayPass}>{creatingPass ? "Creating..." : "One Day Pass"}</Button>
        </div>
      </Card>

      <Card>
        <form onSubmit={submit} className="grid gap-4 lg:grid-cols-2">
          <label className="grid gap-1 text-sm font-bold text-slate-800">
            Member
            <Select value={memberId} onChange={(event) => setMemberId(event.target.value)} required>
              <option value="">Select member</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {cleanLabel(member.name ?? member.fullName, "Member")}
                  {member.membershipEndDate ? ` - valid until ${member.membershipEndDate}` : ""}
                </option>
              ))}
            </Select>
          </label>

          <label className="grid gap-1 text-sm font-bold text-slate-800">
            Membership plan
            <Select value={planId} onChange={(event) => setPlanId(event.target.value)} required>
              <option value="">Select plan</option>
              {plans
                .filter((plan) => plan.isActive !== false && (!selectedMember?.gymId || !plan.gymId || plan.gymId === selectedMember.gymId))
                .map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} {plan.durationMonths ? `- ${plan.durationMonths} mo` : ""} {plan.price ? `- ${money(plan.price)}` : ""}
                  </option>
                ))}
            </Select>
          </label>

          <label className="grid gap-1 text-sm font-bold text-slate-800">
            Renewal start date
            <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required />
          </label>

          <label className="grid gap-1 text-sm font-bold text-slate-800">
            Payment amount
            <Input type="number" min="0" step="0.01" value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} placeholder={selectedPlan?.price ? String(selectedPlan.price) : "Optional"} />
          </label>

          <label className="grid gap-1 text-sm font-bold text-slate-800">
            Payment method
            <Select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
              <option>Card</option>
              <option>Cash</option>
              <option>Transfer</option>
            </Select>
          </label>

          <div className="flex items-end">
            <Button className="min-h-11 w-full" disabled={saving}>{saving ? "Renewing..." : "Renew membership"}</Button>
          </div>
        </form>
      </Card>

      <DataTable
        title="Members Needing Renewal"
        rows={memberRows}
        columns={[
          { key: "name", label: "Member", render: (row) => cleanLabel(row.name ?? row.fullName, "Member") },
          { key: "phone", label: "Phone" },
          { key: "status", label: "Membership", badge: true },
          { key: "membershipEndDate", label: "Valid Until", render: (row) => dateLabel(row.membershipEndDate) },
          { key: "paymentStatus", label: "Payment", badge: true }
        ]}
        actions={[
          {
            label: "Renew",
            onClick: (row) => {
              setMemberId(String(row.id));
              setPlanId("");
              setStartDate(todayIso());
              setMessage("");
              setError("");
            }
          }
        ]}
      />

      <DataTable
        title="Recent Membership Records"
        rows={(memberships.data ?? []).slice(0, 25)}
        columns={[
          { key: "memberId", label: "Member" },
          { key: "planId", label: "Plan" },
          { key: "startDate", label: "Start", render: (row: MemberMembership) => dateLabel(row.startDate) },
          { key: "endDate", label: "End", render: (row: MemberMembership) => dateLabel(row.endDate) },
          { key: "status", label: "Status", badge: true }
        ]}
      />
    </div>
  );
}
