"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@doctor-tracker-app/ui/components/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@doctor-tracker-app/ui/components/chart";
import { useId } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

import type { ConditionBreakdown, IntakeBucket, PatientsPerDoctor } from "../api";

const intakeConfig = {
  count: { label: "New patients", color: "var(--chart-1)" },
} satisfies ChartConfig;

/** 12-month intake trend. */
export function IntakeLineChart({ buckets }: { buckets: IntakeBucket[] }) {
  const gradientId = `intake-fill-${useId().replace(/:/g, "")}`;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Patient intake — last 12 months</CardTitle>
        <CardDescription>New patient registrations per month</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={intakeConfig} className="h-64 w-full">
          <AreaChart data={buckets} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-count)" stopOpacity={0.22} />
                <stop offset="100%" stopColor="var(--color-count)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={16} />
            <YAxis tickLine={false} axisLine={false} width={36} allowDecimals={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area
              dataKey="count"
              type="monotone"
              stroke="var(--color-count)"
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

const perDoctorConfig = {
  count: { label: "Patients", color: "var(--chart-2)" },
} satisfies ChartConfig;

const truncateName = (value: string) =>
  value.length > 20 ? `${value.slice(0, 19)}…` : value;

/** Workload distribution across the busiest doctors (horizontal bars). */
export function PatientsPerDoctorChart({ rows }: { rows: PatientsPerDoctor[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Patients per doctor{rows.length > 0 ? ` — top ${rows.length}` : ""}</CardTitle>
        <CardDescription>Assigned patients across the busiest doctors</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={perDoctorConfig} className="h-64 w-full">
          <BarChart
            data={rows}
            layout="vertical"
            margin={{ top: 8, right: 16, bottom: 0, left: 8 }}
          >
            <CartesianGrid horizontal={false} />
            <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
            <YAxis
              dataKey="doctorName"
              type="category"
              tickLine={false}
              axisLine={false}
              width={132}
              interval={0}
              // Plain <text> ticks: Recharts' Text wrapper word-wraps long
              // names onto two lines, which breaks the bar rhythm.
              tick={({ x, y, payload }: { x?: string | number; y?: string | number; payload?: { value?: unknown } }) => (
                <text
                  x={x}
                  y={y}
                  dy={4}
                  textAnchor="end"
                  fontSize={11}
                  className="fill-muted-foreground"
                >
                  {truncateName(String(payload?.value ?? ""))}
                </text>
              )}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="count" fill="var(--color-count)" radius={[0, 4, 4, 0]} barSize={14} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

/** Donut slice keys must be CSS-var safe, so conditions are slugged. */
const slug = (value: string) => value.replace(/[^a-zA-Z0-9]+/g, "");

/** Care mix by condition. */
export function ConditionDonut({ rows }: { rows: ConditionBreakdown[] }) {
  const data = rows.map((row) => ({
    condition: row.condition,
    count: row.count,
    key: slug(row.condition),
  }));
  const config: ChartConfig = Object.fromEntries(
    rows.map((row, index) => [
      slug(row.condition),
      { label: row.condition, color: `var(--chart-${(index % 8) + 1})` },
    ]),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Patients by condition</CardTitle>
        <CardDescription>Care mix across assigned patients</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="mx-auto h-64 w-full">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent nameKey="key" />} />
            <ChartLegend content={<ChartLegendContent nameKey="key" />} />
            <Pie
              data={data}
              dataKey="count"
              nameKey="key"
              innerRadius="55%"
              outerRadius="80%"
              paddingAngle={2}
              strokeWidth={2}
            >
              {data.map((entry) => (
                <Cell key={entry.key} fill={`var(--color-${entry.key})`} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
