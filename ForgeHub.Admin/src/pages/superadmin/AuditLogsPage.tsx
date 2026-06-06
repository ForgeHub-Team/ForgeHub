import { auditLogsApi, type AuditLog } from "../../api/auditLogsApi";
import { Card } from "../../components/ui/Card";
import { DataTable } from "../../components/ui/DataTable";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingState } from "../../components/ui/LoadingState";
import { PageHeader } from "../../components/ui/PageHeader";
import { Select } from "../../components/ui/Select";
import { useApi } from "../../hooks/useApi";
import { useMemo, useState } from "react";

interface BarPoint {
  label: string;
  count: number;
}

type AuditRange = "1d" | "7d" | "1m";

const rangeLabels: Record<AuditRange, string> = {
  "1d": "Last 1 day",
  "7d": "Last 7 days",
  "1m": "Last 1 month"
};

function getRangeStart(range: AuditRange) {
  const start = new Date();
  if (range === "1m") {
    start.setMonth(start.getMonth() - 1);
  } else {
    start.setDate(start.getDate() - (range === "7d" ? 7 : 1));
  }
  return start.toISOString();
}

function countBy(rows: AuditLog[], getLabel: (row: AuditLog) => string) {
  const counts = new Map<string, number>();
  rows.forEach((row) => {
    const label = getLabel(row).trim() || "Unknown";
    counts.set(label, (counts.get(label) ?? 0) + 1);
  });
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function BarList({ title, data }: { title: string; data: BarPoint[] }) {
  const max = Math.max(...data.map((item) => item.count), 1);
  return (
    <Card className="p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-black text-slate-950">{title}</h2>
        <span className="text-xs font-bold uppercase text-forge-muted">{data.length} groups</span>
      </div>
      <div className="space-y-3">
        {data.slice(0, 12).map((item) => (
          <div key={item.label} className="grid gap-1">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate font-semibold text-slate-800">{item.label}</span>
              <span className="font-black text-slate-950">{item.count}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-forge-primary" style={{ width: `${Math.max(8, (item.count / max) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "Unknown";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export function AuditLogsPage() {
  const [range, setRange] = useState<AuditRange>("1d");
  const from = useMemo(() => getRangeStart(range), [range]);
  const { data, loading, error } = useApi(() => auditLogsApi.getAuditLogs({ from }), [from]);
  const rows = data ?? [];
  const actionCounts = useMemo(() => countBy(rows, (row) => row.action ?? ""), [rows]);
  const actorCounts = useMemo(() => countBy(rows, (row) => row.userName ?? ""), [rows]);
  const latest = rows[0]?.createdAt ? formatDate(rows[0].createdAt) : "No logs yet";

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <>
      <PageHeader
        title="Audit Logs"
        description={`Operational audit activity from the backend audit-log endpoint. Showing ${rangeLabels[range].toLowerCase()}.`}
        action={(
          <Select className="min-w-40" value={range} onChange={(event) => setRange(event.target.value as AuditRange)}>
            <option value="1d">Last 1 day</option>
            <option value="7d">Last 7 days</option>
            <option value="1m">Last 1 month</option>
          </Select>
        )}
      />
      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs font-bold uppercase text-forge-muted">Logs loaded</p>
          <p className="mt-2 text-3xl font-black text-slate-950">{rows.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-bold uppercase text-forge-muted">Action types</p>
          <p className="mt-2 text-3xl font-black text-slate-950">{actionCounts.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-bold uppercase text-forge-muted">Latest activity</p>
          <p className="mt-2 text-sm font-black text-slate-950">{latest}</p>
        </Card>
      </div>
      <div className="mb-4 grid gap-4 xl:grid-cols-2">
        <BarList title="Action vs Count" data={actionCounts} />
        <BarList title="Actor vs Count" data={actorCounts} />
      </div>
      <DataTable<AuditLog>
        title="Raw Audit Logs"
        rows={rows}
        columns={[
          { key: "action", label: "Action" },
          { key: "userName", label: "Actor" },
          { key: "tableName", label: "Table" },
          { key: "recordId", label: "Record" },
          { key: "createdAt", label: "Created", render: (row) => formatDate(row.createdAt) }
        ]}
      />
    </>
  );
}
