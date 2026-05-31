import { useMemo, useState } from "react";
import { EmptyState } from "./EmptyState";
import { SearchInput } from "./SearchInput";
import { StatusBadge } from "./StatusBadge";
import { Button } from "./Button";

function displayCell(value: unknown) {
  if (value === null || value === undefined || value === "") return "Not assigned";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "Not configured";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return "Unknown";
  const text = String(value);
  return text === "undefined" || text === "null" || text === "NaN" || text === "Infinity" ? "Unknown" : text;
}

export interface DataColumn<T> {
  key: keyof T | string;
  label: string;
  render?: (row: T) => React.ReactNode;
  badge?: boolean;
}

export interface RowAction<T> {
  label: string;
  variant?: "secondary" | "danger" | "ghost";
  hidden?: (row: T) => boolean;
  onClick: (row: T) => void;
}

export function DataTable<T extends { id?: string | number }>({
  title,
  rows,
  columns,
  onCreate,
  createLabel = "Create",
  onRowClick,
  actions = []
}: {
  title: string;
  rows: T[];
  columns: DataColumn<T>[];
  onCreate?: () => void;
  createLabel?: string;
  onRowClick?: (row: T) => void;
  actions?: RowAction<T>[];
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    if (!query) return rows;
    const q = query.toLowerCase();
    return rows.filter((row) => JSON.stringify(row).toLowerCase().includes(q));
  }, [rows, query]);

  return (
    <section className="overflow-hidden rounded-2xl border border-forge-border bg-white shadow-panel">
      <div className="flex flex-col gap-3 border-b border-forge-border p-3 sm:p-4 md:flex-row md:items-center md:justify-between">
        <h2 className="text-lg font-bold text-slate-950">{title}</h2>
        <div className="flex flex-col gap-2 sm:flex-row">
          <SearchInput value={query} onChange={setQuery} placeholder={`Search ${title.toLowerCase()}`} />
          {onCreate ? <Button onClick={onCreate}>{createLabel}</Button> : null}
        </div>
      </div>
      {filtered.length === 0 ? (
        <div className="p-3 sm:p-4"><EmptyState /></div>
      ) : (
        <>
        <div className="grid gap-3 p-3 md:hidden">
          {filtered.map((row, index) => {
            const visibleActions = actions.filter((action) => !action.hidden?.(row));
            return (
              <article
                key={row.id ?? index}
                onClick={() => onRowClick?.(row)}
                className={`rounded-xl border border-forge-border bg-white p-3 shadow-sm ${onRowClick ? "cursor-pointer active:bg-orange-50" : ""}`}
              >
                <div className="space-y-2">
                  {columns.map((column, columnIndex) => {
                    const value = (row as Record<string, unknown>)[String(column.key)];
                    return (
                      <div key={String(column.key)} className={columnIndex === 0 ? "" : "flex items-start justify-between gap-3 border-t border-slate-100 pt-2"}>
                        {columnIndex === 0 ? (
                          <>
                            <p className="text-xs font-bold uppercase text-forge-muted">{column.label}</p>
                            <div className="mt-1 text-base font-black text-slate-950">
                              {column.render ? column.render(row) : column.badge ? <StatusBadge value={displayCell(value)} /> : displayCell(value)}
                            </div>
                          </>
                        ) : (
                          <>
                            <span className="text-xs font-bold uppercase text-forge-muted">{column.label}</span>
                            <span className="max-w-[60%] text-right text-sm font-semibold text-slate-800">
                              {column.render ? column.render(row) : column.badge ? <StatusBadge value={displayCell(value)} /> : displayCell(value)}
                            </span>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
                {visibleActions.length ? (
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                    {visibleActions.map((action) => (
                      <Button
                        type="button"
                        key={action.label}
                        variant={action.variant ?? "secondary"}
                        className="min-h-10 flex-1"
                        onClick={(event) => {
                          event.stopPropagation();
                          action.onClick(row);
                        }}
                      >
                        {action.label}
                      </Button>
                    ))}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-forge-muted">
              <tr>{columns.map((column) => <th className="px-4 py-3" key={String(column.key)}>{column.label}</th>)}{actions.length ? <th className="px-4 py-3 text-right">Actions</th> : null}</tr>
            </thead>
            <tbody className="divide-y divide-forge-border">
              {filtered.map((row, index) => (
                <tr key={row.id ?? index} onClick={() => onRowClick?.(row)} className={onRowClick ? "cursor-pointer hover:bg-orange-50/40" : ""}>
                  {columns.map((column) => {
                    const value = (row as Record<string, unknown>)[String(column.key)];
                    return (
                      <td className="px-4 py-3" key={String(column.key)}>
                        {column.render ? column.render(row) : column.badge ? <StatusBadge value={displayCell(value)} /> : displayCell(value)}
                      </td>
                    );
                  })}
                  {actions.length ? (
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        {actions.filter((action) => !action.hidden?.(row)).map((action) => (
                          <Button
                            type="button"
                            key={action.label}
                            variant={action.variant ?? "secondary"}
                            onClick={(event) => {
                              event.stopPropagation();
                              action.onClick(row);
                            }}
                          >
                            {action.label}
                          </Button>
                        ))}
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
    </section>
  );
}
