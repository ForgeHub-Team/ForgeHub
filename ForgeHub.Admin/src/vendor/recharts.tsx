import React from "react";

const defaultColors = ["#2563EB", "#16A34A", "#F97316", "#7C3AED", "#DC2626", "#0891B2"];

export function ResponsiveContainer({ children }: { children: React.ReactNode }) {
  return <div className="h-full w-full">{children}</div>;
}

export function BarChart({ children }: { children: React.ReactNode; data?: unknown[] }) {
  return <div className="flex h-full items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-500">{children}</div>;
}

export function PieChart({ children }: { children: React.ReactNode; data?: unknown[] }) {
  const pie = React.Children.toArray(children).find((child) => React.isValidElement(child) && child.type === Pie);
  const data = React.isValidElement(pie) ? (pie.props as { data?: { value?: number }[] }).data ?? [] : [];
  const innerRadius = React.isValidElement(pie) ? Number((pie.props as { innerRadius?: number }).innerRadius ?? 0) : 0;
  const total = data.reduce((sum, item) => sum + Number(item.value ?? 0), 0);
  let start = 0;
  const stops = data.map((item, index) => {
    const value = total > 0 ? (Number(item.value ?? 0) / total) * 100 : 0;
    const stop = `${defaultColors[index % defaultColors.length]} ${start}% ${start + value}%`;
    start += value;
    return stop;
  });

  return (
    <div className="flex h-full items-center justify-center">
      <div className="relative h-52 w-52 rounded-full" style={{ background: `conic-gradient(${stops.join(", ")})` }}>
        {innerRadius > 0 ? <div className="absolute inset-14 rounded-full bg-white" /> : null}
      </div>
    </div>
  );
}

export function LineChart({ data = [] }: { children: React.ReactNode; data?: { time?: string; checkIns?: number }[] }) {
  const width = 520;
  const height = 220;
  const padding = 28;
  const max = Math.max(1, ...data.map((item) => Number(item.checkIns ?? 0)));
  const points = data.map((item, index) => {
    const x = padding + (data.length <= 1 ? 0 : (index / (data.length - 1)) * (width - padding * 2));
    const y = height - padding - (Number(item.checkIns ?? 0) / max) * (height - padding * 2);
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full rounded-xl bg-slate-50">
      <polyline points={points} fill="none" stroke="#F97316" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((item, index) => {
        const [x, y] = points.split(" ")[index]?.split(",").map(Number) ?? [padding, height - padding];
        return <g key={`${item.time}-${index}`}><circle cx={x} cy={y} r="4" fill="#F97316" /><text x={x} y={height - 8} textAnchor="middle" className="fill-slate-500 text-[10px]">{item.time}</text></g>;
      })}
    </svg>
  );
}

export function Bar(_: Record<string, unknown>) { return null; }
export function CartesianGrid(_: Record<string, unknown>) { return null; }
export function Cell(_: Record<string, unknown>) { return null; }
export function Line(_: Record<string, unknown>) { return null; }
export function Pie(_: Record<string, unknown>) { return null; }
export function Tooltip(_: Record<string, unknown>) { return null; }
export function XAxis(_: Record<string, unknown>) { return null; }
export function YAxis(_: Record<string, unknown>) { return null; }
