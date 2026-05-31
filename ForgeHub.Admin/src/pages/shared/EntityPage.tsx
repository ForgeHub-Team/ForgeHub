import { useState } from "react";
import { DataTable, type DataColumn } from "../../components/ui/DataTable";
import type { RowAction } from "../../components/ui/DataTable";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingState } from "../../components/ui/LoadingState";
import { Modal } from "../../components/ui/Modal";
import { PageHeader } from "../../components/ui/PageHeader";
import { useApi } from "../../hooks/useApi";

export function EntityPage<T extends { id?: number | string }>({
  title,
  description,
  loader,
  columns,
  createLabel,
  form,
  editForm,
  detailRenderer,
  actions = []
}: {
  title: string;
  description?: string;
  loader: () => Promise<T[]>;
  columns: DataColumn<T>[];
  createLabel?: string;
  form?: (close: () => void, reload: () => void) => React.ReactNode;
  editForm?: (row: T, close: () => void, reload: () => void) => React.ReactNode;
  detailRenderer?: (row: T) => React.ReactNode;
  actions?: RowAction<T>[];
}) {
  const { data, loading, error, reload } = useApi(loader, []);
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState<T | null>(null);
  const [editing, setEditing] = useState<T | null>(null);
  const [confirm, setConfirm] = useState<{ title: string; message: string; action: () => Promise<void> | void } | null>(null);
  const [notice, setNotice] = useState("");
  const wrappedActions: RowAction<T>[] = [
    { label: "View", variant: "secondary", onClick: setDetails },
    ...(editForm ? [{ label: "Edit", variant: "secondary" as const, onClick: setEditing }] : []),
    ...actions.map((action) => ({
      ...action,
      onClick: (row: T) => {
        if (action.variant === "danger") {
          setConfirm({
            title: action.label,
            message: `Confirm ${action.label.toLowerCase()} for this record?`,
            action: async () => {
              await action.onClick(row);
              setConfirm(null);
              setNotice(`${action.label} completed.`);
              await reload();
            }
          });
          return;
        }
        action.onClick(row);
      }
    }))
  ];

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  return (
    <>
      <PageHeader title={title} description={description} />
      {notice ? <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{notice}</div> : null}
      <DataTable title={title} rows={data ?? []} columns={columns} createLabel={createLabel} onCreate={form ? () => setOpen(true) : undefined} actions={wrappedActions} />
      {form ? <Modal open={open} title={createLabel ?? "Create"} onClose={() => setOpen(false)}>{form(() => setOpen(false), reload)}</Modal> : null}
      {editForm && editing ? <Modal open={Boolean(editing)} title={`Edit ${title}`} onClose={() => setEditing(null)}>{editForm(editing, () => setEditing(null), reload)}</Modal> : null}
      <Modal open={Boolean(details)} title={`${title} details`} onClose={() => setDetails(null)}>
        {details && detailRenderer ? detailRenderer(details) : (
          <dl className="grid gap-3 text-sm md:grid-cols-2">
            {details ? Object.entries(details as Record<string, unknown>).map(([key, value]) => (
              <div key={key} className="rounded-xl border border-forge-border bg-slate-50 p-3">
                <dt className="text-xs font-semibold uppercase text-forge-muted">{key}</dt>
                <dd className="mt-1 break-words font-semibold text-slate-900">{String(value ?? "Not available")}</dd>
              </div>
            )) : null}
          </dl>
        )}
      </Modal>
      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.title ?? "Confirm action"}
        message={confirm?.message ?? "Confirm this action?"}
        onClose={() => setConfirm(null)}
        onConfirm={() => void confirm?.action()}
      />
    </>
  );
}
