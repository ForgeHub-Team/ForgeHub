import { useMemo, useState } from "react";
import { Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { dashboardApi } from "../../api/dashboardApi";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingState } from "../../components/ui/LoadingState";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { useApi } from "../../hooks/useApi";
import type { Branch } from "../../types/branch";
import type { CheckIn } from "../../types/checkIn";
import type { Member } from "../../types/member";
import type { Payment } from "../../types/payment";
import { dateLabel, money, timeLabel } from "../../utils/formatters";

const colors = ["#2563EB", "#16A34A", "#F97316", "#7C3AED", "#DC2626", "#0891B2"];

type ViewMode = "chart" | "data";

interface RevenueRow {
  id: number;
  branchName: string;
  totalRevenue: number;
  paymentCount: number;
  dateRange: string;
}

interface MemberBranchRow {
  id: number;
  branchName: string;
  memberCount: number;
  activeMembers: number;
  inactiveMembers: number;
}

interface CheckInRow {
  id: number;
  memberName: string;
  branchName: string;
  checkInTime: string;
  checkOutTime: string;
  status: string;
  checkInDate: Date | null;
}

function branchLabel(branch?: Branch) {
  return branch?.name?.trim() || "Unknown branch";
}

function todayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function parseDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function checkInDate(checkIn: CheckIn) {
  return parseDate(checkIn.checkInTime ?? checkIn.at);
}

function amountValue(value: unknown) {
  if (typeof value === "number") return value;
  return Number(String(value ?? "").replace(/[^0-9.-]/g, "")) || 0;
}

function paymentDate(payment: Payment) {
  return parseDate(payment.paidAt ?? payment.at ?? null);
}

function dateRange(payments: Payment[]) {
  const dates = payments.map(paymentDate).filter((date): date is Date => Boolean(date)).sort((a, b) => a.getTime() - b.getTime());
  if (!dates.length) return "No payments";
  const first = dateLabel(dates[0].toISOString());
  const last = dateLabel(dates[dates.length - 1].toISOString());
  return first === last ? first : `${first} - ${last}`;
}

function isActiveMember(member: Member) {
  const status = String(member.status ?? "").toLowerCase();
  if (status) return status.includes("active") && !status.includes("inactive");
  return member.isActive === true;
}

function todayCheckInRows(attendance: CheckIn[], branchMap: Map<number, Branch>): CheckInRow[] {
  const now = new Date();
  return attendance
    .map((checkIn) => {
      const date = checkInDate(checkIn);
      return {
        id: checkIn.id,
        memberName: checkIn.memberName?.trim() || "Member",
        branchName: branchMap.get(Number(checkIn.branchId))?.name ?? "Unknown branch",
        checkInTime: checkIn.checkInTime ?? checkIn.at ?? "",
        checkOutTime: checkIn.checkOutTime ?? "",
        status: checkIn.status ?? (checkIn.checkOutTime ? "Checked out" : "Checked in"),
        checkInDate: date
      };
    })
    .filter((row) => row.checkInDate && todayKey(row.checkInDate) === todayKey(now))
    .sort((a, b) => (a.checkInDate?.getTime() ?? 0) - (b.checkInDate?.getTime() ?? 0));
}

function lineSeries(rows: CheckInRow[]) {
  const buckets = new Map<string, number>();
  rows.forEach((row) => {
    if (!row.checkInDate) return;
    const label = `${String(row.checkInDate.getHours()).padStart(2, "0")}:00`;
    buckets.set(label, (buckets.get(label) ?? 0) + 1);
  });
  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([time, checkIns]) => ({ time, checkIns }));
}

function SegmentedView({ value, onChange }: { value: ViewMode; onChange: (value: ViewMode) => void }) {
  return (
    <div className="inline-flex rounded-lg border border-forge-border bg-slate-50 p-1">
      <Button type="button" variant={value === "chart" ? "primary" : "ghost"} className="min-h-8 px-3 py-1" onClick={() => onChange("chart")}>Chart</Button>
      <Button type="button" variant={value === "data" ? "primary" : "ghost"} className="min-h-8 px-3 py-1" onClick={() => onChange("data")}>Data</Button>
    </div>
  );
}

function SimpleTable<T>({ rows, columns, emptyTitle }: { rows: T[]; columns: { key: string; label: string; render: (row: T) => React.ReactNode }[]; emptyTitle: string }) {
  if (!rows.length) return <EmptyState title={emptyTitle} />;

  return (
    <div className="overflow-x-auto rounded-lg border border-forge-border">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-forge-muted">
          <tr>{columns.map((column) => <th className="px-4 py-3" key={column.key}>{column.label}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-forge-border">
          {rows.map((row, index) => (
            <tr key={index}>
              {columns.map((column) => <td className="px-4 py-3" key={column.key}>{column.render(row)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PieReportCard<T extends { id: number; branchName: string }>({
  title,
  rows,
  value,
  valueFormatter,
  view,
  onViewChange,
  columns
}: {
  title: string;
  rows: T[];
  value: (row: T) => number;
  valueFormatter?: (value: number) => string;
  view: ViewMode;
  onViewChange: (value: ViewMode) => void;
  columns: { key: string; label: string; render: (row: T) => React.ReactNode }[];
}) {
  const chartData = rows.map((row) => ({ name: row.branchName, value: value(row) })).filter((item) => item.value > 0);

  return (
    <Card>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-bold text-slate-950">{title}</h2>
        <SegmentedView value={view} onChange={onViewChange} />
      </div>
      {view === "data" ? (
        <SimpleTable rows={rows} columns={columns} emptyTitle="No source data available yet." />
      ) : !chartData.length ? (
        <EmptyState title="No chart data available yet." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartData} dataKey="value" nameKey="name" outerRadius={104} paddingAngle={2}>
                  {chartData.map((item, index) => <Cell key={item.name} fill={colors[index % colors.length]} />)}
                </Pie>
                <Tooltip formatter={(rawValue: unknown) => valueFormatter ? valueFormatter(Number(rawValue)) : rawValue} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2">
            {chartData.map((item, index) => (
              <div key={item.name} className="flex items-center justify-between gap-3 rounded-lg border border-forge-border px-3 py-2 text-sm">
                <span className="flex items-center gap-2 font-semibold text-slate-800"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />{item.name}</span>
                <span className="font-bold text-slate-950">{valueFormatter ? valueFormatter(item.value) : item.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

export function OwnerReportsPage() {
  const { data, loading, error } = useApi(dashboardApi.getWorkspace, []);
  const [revenueView, setRevenueView] = useState<ViewMode>("chart");
  const [memberView, setMemberView] = useState<ViewMode>("chart");
  const [checkInView, setCheckInView] = useState<ViewMode>("chart");

  const branches = data?.branches ?? [];
  const payments = data?.payments ?? [];
  const members = data?.members ?? [];
  const attendance = data?.attendance ?? [];

  const branchMap = useMemo(() => new Map(branches.map((branch) => [branch.id, branch])), [branches]);
  const revenueRows = useMemo<RevenueRow[]>(() => branches.map((branch) => {
    const branchPayments = payments.filter((payment) => payment.branchId === branch.id);
    return {
      id: branch.id,
      branchName: branchLabel(branch),
      totalRevenue: branchPayments.reduce((sum, payment) => sum + amountValue(payment.amountValue ?? payment.amount), 0),
      paymentCount: branchPayments.length,
      dateRange: dateRange(branchPayments)
    };
  }), [branches, payments]);
  const memberRows = useMemo<MemberBranchRow[]>(() => branches.map((branch) => {
    const branchMembers = members.filter((member) => (member.branchId ?? member.homeBranchId) === branch.id);
    const activeMembers = branchMembers.filter(isActiveMember).length;
    return {
      id: branch.id,
      branchName: branchLabel(branch),
      memberCount: branchMembers.length,
      activeMembers,
      inactiveMembers: branchMembers.length - activeMembers
    };
  }), [branches, members]);
  const checkInRows = useMemo(() => todayCheckInRows(attendance, branchMap), [attendance, branchMap]);
  const checkInSeries = useMemo(() => lineSeries(checkInRows), [checkInRows]);
  const totalToday = checkInRows.length;

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <>
      <PageHeader title="Reports" description="Scoped analytics for your gym and branches." />
      <div className="grid gap-4 xl:grid-cols-2">
        <PieReportCard
          title="Revenue by Branch"
          rows={revenueRows}
          value={(row) => row.totalRevenue}
          valueFormatter={money}
          view={revenueView}
          onViewChange={setRevenueView}
          columns={[
            { key: "branchName", label: "Branch", render: (row) => row.branchName },
            { key: "totalRevenue", label: "Total Revenue", render: (row) => money(row.totalRevenue) },
            { key: "paymentCount", label: "Transactions", render: (row) => row.paymentCount },
            { key: "dateRange", label: "Date Range", render: (row) => row.dateRange }
          ]}
        />
        <PieReportCard
          title="Members by Branch"
          rows={memberRows}
          value={(row) => row.memberCount}
          view={memberView}
          onViewChange={setMemberView}
          columns={[
            { key: "branchName", label: "Branch", render: (row) => row.branchName },
            { key: "memberCount", label: "Members", render: (row) => row.memberCount },
            { key: "activeMembers", label: "Active", render: (row) => row.activeMembers },
            { key: "inactiveMembers", label: "Inactive", render: (row) => row.inactiveMembers }
          ]}
        />
      </div>
      <Card>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Active Today / Today's Check-ins</h2>
            <span className="text-sm font-semibold text-forge-muted">{totalToday} check-ins today</span>
          </div>
          <SegmentedView value={checkInView} onChange={setCheckInView} />
        </div>
        {checkInView === "data" ? (
          <SimpleTable
            rows={checkInRows}
            emptyTitle="No check-ins recorded today."
            columns={[
              { key: "memberName", label: "Member", render: (row) => row.memberName },
              { key: "branchName", label: "Branch", render: (row) => row.branchName },
              { key: "checkInTime", label: "Check-in", render: (row) => row.checkInTime ? timeLabel(row.checkInTime) : "Not set" },
              { key: "checkOutTime", label: "Check-out", render: (row) => row.checkOutTime ? timeLabel(row.checkOutTime) : "Not checked out" },
              { key: "status", label: "Status", render: (row) => <StatusBadge value={row.status} /> }
            ]}
          />
        ) : !checkInSeries.length ? (
          <EmptyState title="No check-ins recorded today." />
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={checkInSeries}>
                <XAxis dataKey="time" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="checkIns" stroke="#F97316" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
    </>
  );
}
