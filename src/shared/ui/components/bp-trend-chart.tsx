"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatDate } from "@/shared/lib/utils";

interface BpReading {
  observedAt: string;
  systolic: number;
  diastolic: number;
}

interface BpTrendChartProps {
  readings: BpReading[];
  reviewThreshold?: number;
}

export function BpTrendChart({
  readings,
  reviewThreshold = 140,
}: BpTrendChartProps) {
  if (readings.length < 2) {
    return (
      <div className="text-center text-[var(--color-text-muted)] py-4">
        A trend needs at least two BP readings.
      </div>
    );
  }

  // Sort chronologically (oldest first)
  const sorted = [...readings].sort(
    (a, b) =>
      new Date(a.observedAt).getTime() - new Date(b.observedAt).getTime()
  );

  const data = sorted.map((r) => ({
    date: formatDate(r.observedAt),
    systolic: r.systolic,
    diastolic: r.diastolic,
  }));

  const allValues = sorted.flatMap((r) => [r.systolic, r.diastolic, reviewThreshold]);
  const minY = Math.floor(Math.min(...allValues) / 10) * 10 - 10;
  const maxY = Math.ceil(Math.max(...allValues) / 10) * 10 + 10;

  return (
    <div>
      <div className="w-full h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--color-border-default)"
            />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
              stroke="var(--color-border-default)"
            />
            <YAxis
              domain={[minY, maxY]}
              tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
              stroke="var(--color-border-default)"
            />
            <Tooltip
              contentStyle={{
                background: "var(--color-surface-raised)",
                border: "1px solid var(--color-border-default)",
                borderRadius: "var(--radius-md)",
                fontSize: "0.85rem",
              }}
            />
            <ReferenceLine
              y={reviewThreshold}
              stroke="var(--color-warning)"
              strokeDasharray="5 4"
              label={{
                value: `Review (${reviewThreshold})`,
                position: "right",
                fontSize: 11,
                fill: "var(--color-warning)",
              }}
            />
            <Line
              type="monotone"
              dataKey="systolic"
              stroke="var(--color-action-primary)"
              strokeWidth={2.5}
              dot={{ r: 4, fill: "var(--color-action-primary)" }}
              name="Systolic"
            />
            <Line
              type="monotone"
              dataKey="diastolic"
              stroke="var(--color-info)"
              strokeWidth={2.5}
              dot={{ r: 4, fill: "var(--color-info)" }}
              name="Diastolic"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex gap-4 text-[0.85rem] text-[var(--color-text-muted)] mt-2 flex-wrap">
        <span className="flex items-center gap-1">
          <span
            className="inline-block w-3 h-[3px]"
            style={{ background: "var(--color-action-primary)" }}
          />
          Systolic
        </span>
        <span className="flex items-center gap-1">
          <span
            className="inline-block w-3 h-[3px]"
            style={{ background: "var(--color-info)" }}
          />
          Diastolic
        </span>
        <span className="flex items-center gap-1">
          <span
            className="inline-block w-3 h-[3px] border-t-2 border-dashed"
            style={{ borderColor: "var(--color-warning)" }}
          />
          Review threshold ({reviewThreshold})
        </span>
      </div>

      {/* Accessible table alternative */}
      <details className="mt-3">
        <summary className="text-sm text-[var(--color-text-muted)] cursor-pointer">
          View as table
        </summary>
        <table className="w-full border-collapse mt-2 text-sm">
          <thead>
            <tr>
              <th className="text-left p-1.5 border-b border-[var(--color-border-default)] text-[var(--color-text-muted)]">
                Date
              </th>
              <th className="text-left p-1.5 border-b border-[var(--color-border-default)] text-[var(--color-text-muted)]">
                Systolic
              </th>
              <th className="text-left p-1.5 border-b border-[var(--color-border-default)] text-[var(--color-text-muted)]">
                Diastolic
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((d, i) => (
              <tr key={i}>
                <td className="p-1.5 border-b border-[var(--color-border-default)]">
                  {d.date}
                </td>
                <td className="p-1.5 border-b border-[var(--color-border-default)]">
                  {d.systolic} mmHg
                </td>
                <td className="p-1.5 border-b border-[var(--color-border-default)]">
                  {d.diastolic} mmHg
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
