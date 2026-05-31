import { dashboardApi } from "../../api/dashboardApi";
import { trainerSessionsApi } from "../../api/trainerSessionsApi";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { PageHeader } from "../../components/ui/PageHeader";
import { Select } from "../../components/ui/Select";
import { Textarea } from "../../components/ui/Textarea";
import { useApi } from "../../hooks/useApi";
import { useState } from "react";

export function TrainerNotesPage() {
  const workspace = useApi(dashboardApi.getWorkspace, []);
  const [memberId, setMemberId] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    await trainerSessionsApi.createTrainerSession({ memberId: Number(memberId), sessionType: "Note", sessionDate: new Date().toISOString(), notes });
    setMessage("Session note saved.");
    setNotes("");
  }
  return <div className="mx-auto max-w-2xl pb-24"><PageHeader title="Notes" description="Fast session notes saved to trainer_sessions." /><Card><form onSubmit={submit} className="grid gap-4"><label className="grid gap-1 text-sm font-bold text-slate-800">Member<Select value={memberId} onChange={(e) => setMemberId(e.target.value)} required><option value="">Select assigned member</option>{workspace.data?.members.map((member) => <option key={member.id} value={member.id}>{member.name ?? member.fullName}</option>)}</Select></label><label className="grid gap-1 text-sm font-bold text-slate-800">Note<Textarea className="min-h-36" value={notes} onChange={(e) => setNotes(e.target.value)} required /></label>{workspace.error ? <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{workspace.error}</div> : null}{message ? <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div> : null}<Button className="min-h-12 w-full" disabled={workspace.loading}>Save note</Button></form></Card></div>;
}
