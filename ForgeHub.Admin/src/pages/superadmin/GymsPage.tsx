import { API_BASE_URL } from "../../api/apiClient";
import { gymsApi } from "../../api/gymsApi";
import { GymForm } from "../../components/forms/GymForm";
import { StatusBadge } from "../../components/ui/StatusBadge";
import type { Gym } from "../../types/gym";
import { EntityPage } from "../shared/EntityPage";

async function withUploadedLogo(values: Partial<Gym>, logoFile?: File) {
  if (!logoFile) return values;
  const upload = await gymsApi.uploadLogo(logoFile);
  return { ...values, logoUrl: upload.logoUrl };
}

function gymLogoUrl(logoUrl?: string | null) {
  if (!logoUrl?.trim()) return "";
  if (/^https?:\/\//i.test(logoUrl)) return logoUrl;
  return `${API_BASE_URL.replace(/\/api\/?$/, "")}${logoUrl.startsWith("/") ? "" : "/"}${logoUrl}`;
}

function resolveStatus(row: Gym) {
  if (row.status?.trim()) return row.status;
  return row.isActive ? "Active" : "Inactive";
}

function LogoCell({ gym }: { gym: Gym }) {
  const src = gymLogoUrl(gym.logoUrl);
  if (!src) {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-dashed border-forge-border bg-slate-50 text-xs font-black text-forge-muted">
        --
      </div>
    );
  }

  return <img className="h-10 w-10 rounded-lg border border-forge-border object-cover" src={src} alt={`${gym.name} logo`} />;
}

export function GymsPage() {
  return (
    <EntityPage<Gym>
      title="Gyms"
      description="Create and manage gym tenants from the backend."
      loader={gymsApi.getGyms}
      createLabel="Create gym"
      actionsClassName="min-w-[19rem] flex-nowrap"
      actionButtonClassName="w-24"
      columns={[
        { key: "logoUrl", label: "Logo", render: (row) => <LogoCell gym={row} /> },
        { key: "name", label: "Gym" },
        { key: "city", label: "City" },
        { key: "ownerName", label: "Owner", render: (row) => row.ownerName?.trim() || "Not assigned" },
        { key: "status", label: "Status", render: (row) => <StatusBadge value={resolveStatus(row)} /> }
      ]}
      detailRenderer={(row) => {
        const src = gymLogoUrl(row.logoUrl);
        return (
          <dl className="grid gap-3 text-sm md:grid-cols-2">
            <div className="rounded-xl border border-forge-border bg-slate-50 p-3 md:col-span-2">
              <dt className="text-xs font-semibold uppercase text-forge-muted">Logo</dt>
              <dd className="mt-2">{src ? <img className="h-28 w-28 rounded-lg border border-forge-border object-cover" src={src} alt={`${row.name} logo`} /> : <LogoCell gym={row} />}</dd>
            </div>
            <div className="rounded-xl border border-forge-border bg-slate-50 p-3"><dt className="text-xs font-semibold uppercase text-forge-muted">Name</dt><dd className="mt-1 font-semibold text-slate-900">{row.name}</dd></div>
            <div className="rounded-xl border border-forge-border bg-slate-50 p-3"><dt className="text-xs font-semibold uppercase text-forge-muted">City</dt><dd className="mt-1 font-semibold text-slate-900">{row.city ?? "Not assigned"}</dd></div>
            <div className="rounded-xl border border-forge-border bg-slate-50 p-3"><dt className="text-xs font-semibold uppercase text-forge-muted">Owner</dt><dd className="mt-1 font-semibold text-slate-900">{row.ownerName?.trim() || "Not assigned"}</dd></div>
            <div className="rounded-xl border border-forge-border bg-slate-50 p-3"><dt className="text-xs font-semibold uppercase text-forge-muted">Status</dt><dd className="mt-1"><StatusBadge value={resolveStatus(row)} /></dd></div>
          </dl>
        );
      }}
      form={(close, reload) => (
        <GymForm
          onSubmit={async (values, logoFile) => {
            await gymsApi.createGym(await withUploadedLogo({ name: values.name, city: values.city, ownerUserId: values.ownerUserId, isActive: true }, logoFile));
            close();
            await reload();
          }}
        />
      )}
      editForm={(row, close, reload) => (
        <GymForm
          initialValues={{ name: row.name, city: row.city ?? undefined, logoUrl: row.logoUrl ?? undefined, ownerUserId: row.ownerUserId ?? undefined }}
          onSubmit={async (values, logoFile) => {
            await gymsApi.updateGym(row.id, await withUploadedLogo({ name: values.name, city: values.city, ownerUserId: values.ownerUserId, logoUrl: row.logoUrl, isActive: row.isActive ?? row.status === "Active" }, logoFile));
            close();
            await reload();
          }}
        />
      )}
      actions={[
        { label: "Activate", variant: "primary", onClick: async (row) => { await gymsApi.activateGym(row); }, hidden: (row) => row.isActive === true || row.status === "Active" },
        { label: "Deactivate", variant: "danger", onClick: async (row) => { await gymsApi.deactivateGym(row); }, hidden: (row) => !(row.isActive === true || row.status === "Active") }
      ]}
    />
  );
}
