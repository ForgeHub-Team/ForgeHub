import { useState } from "react";
import { checkInsApi } from "../../api/checkInsApi";
import { dashboardApi } from "../../api/dashboardApi";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { ErrorState } from "../../components/ui/ErrorState";
import { PageHeader } from "../../components/ui/PageHeader";
import { Select } from "../../components/ui/Select";
import { useApi } from "../../hooks/useApi";

export function ManualCheckInPage() {
  const workspace = useApi(dashboardApi.getWorkspace, []);
  const [memberId, setMemberId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(""); setMessage("");
    try {
      await checkInsApi.manualCheckIn(Number(memberId));
      setMessage("Manual check-in saved to the backend.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Manual check-in failed.");
    }
  }
  return <><PageHeader title="Check-in / Check-out" description="Manual staff attendance writes to check_ins and backend audit logs." /><Card><form onSubmit={submit} className="grid max-w-lg gap-4"><label>Member<Select required value={memberId} onChange={(e) => setMemberId(e.target.value)}><option value="">Select member</option>{workspace.data?.members.map((member) => <option key={member.id} value={member.id}>{member.name ?? member.fullName} {member.phone ? `- ${member.phone}` : ""}</option>)}</Select></label>{workspace.error ? <ErrorState message={workspace.error} /> : null}{error ? <ErrorState message={error} /> : null}{message ? <div className="rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{message}</div> : null}<Button disabled={workspace.loading}>Manual check-in</Button></form></Card></>;
}
