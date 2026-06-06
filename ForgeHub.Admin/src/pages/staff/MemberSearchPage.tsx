import { useEffect, useState } from "react";
import { membersApi } from "../../api/membersApi";
import { MemberPersonalInfoPanel } from "../../components/members/MemberPersonalInfoPanel";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { DataTable } from "../../components/ui/DataTable";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingState } from "../../components/ui/LoadingState";
import { PageHeader } from "../../components/ui/PageHeader";
import { Select } from "../../components/ui/Select";
import type { Member } from "../../types/member";

const pageSize = 15;

export function MemberSearchPage() {
  const [status, setStatus] = useState("");
  const [attendance, setAttendance] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ items: Member[]; totalCount: number; totalPages: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [details, setDetails] = useState<Member | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    membersApi.searchStaffMembers({ page, pageSize, status, attendance, search: query })
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unable to load members.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [attendance, page, query, status]);

  function updateFilter(setter: (value: string) => void, value: string) {
    setter(value);
    setPage(1);
  }

  if (loading && !data) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  const rows = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="space-y-4">
      <PageHeader title="Member Search" description="Search and filter branch members from the backend." />
      <Card>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm font-bold text-slate-800">
            Status
            <Select value={status} onChange={(event) => updateFilter(setStatus, event.target.value)}>
              <option value="">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="EXPIRED">Expired</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="FROZEN">Frozen</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="PENDING">Pending</option>
            </Select>
          </label>
          <label className="grid gap-1 text-sm font-bold text-slate-800">
            Attendance
            <Select value={attendance} onChange={(event) => updateFilter(setAttendance, event.target.value)}>
              <option value="">All</option>
              <option value="CurrentlyCheckedIn">Currently checked in</option>
              <option value="CheckedInToday">Checked in today</option>
              <option value="NotCheckedInToday">Not checked in today</option>
            </Select>
          </label>
        </div>
      </Card>
      <DataTable
        title="Member Search"
        rows={rows}
        columns={[{ key: "name", label: "Name" }, { key: "phone", label: "Phone" }, { key: "email", label: "Email" }, { key: "status", label: "Status", badge: true }, { key: "attendanceToday", label: "Attendance", badge: true }]}
        searchValue={query}
        onSearchChange={(value) => updateFilter(setQuery, value)}
        actions={[{ label: "View", variant: "secondary", onClick: setDetails }]}
      />
      <div className="flex items-center justify-between rounded-lg border border-forge-border bg-white px-3 py-2 text-sm font-semibold text-slate-700">
        <span>Page {page} of {totalPages} ({data?.totalCount ?? 0} members)</span>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" disabled={page <= 1 || loading} onClick={() => setPage((current) => Math.max(1, current - 1))} aria-label="Previous page">
            <span aria-hidden="true">&lt;</span>
          </Button>
          <Button type="button" variant="secondary" disabled={page >= totalPages || loading} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} aria-label="Next page">
            <span aria-hidden="true">&gt;</span>
          </Button>
        </div>
      </div>
      {details ? (
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-950">Member details</h2>
            <Button type="button" variant="ghost" onClick={() => setDetails(null)}>Close</Button>
          </div>
          <MemberPersonalInfoPanel memberId={Number(details.id)} />
        </Card>
      ) : null}
    </div>
  );
}
