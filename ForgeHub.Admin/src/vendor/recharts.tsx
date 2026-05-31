export function ResponsiveContainer({ children }: { children: React.ReactNode }) { return <div className="h-full w-full">{children}</div>; }
export function BarChart({ children }: { children: React.ReactNode; data?: unknown[] }) { return <div className="flex h-full items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-500">{children}</div>; }
export function Bar(_: Record<string, unknown>) { return null; }
export function CartesianGrid(_: Record<string, unknown>) { return null; }
export function Tooltip(_: Record<string, unknown>) { return null; }
export function XAxis(_: Record<string, unknown>) { return null; }
export function YAxis(_: Record<string, unknown>) { return null; }
