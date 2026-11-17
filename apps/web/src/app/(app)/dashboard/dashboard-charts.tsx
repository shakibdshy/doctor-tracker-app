"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@doctor-tracker-app/ui/components/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@doctor-tracker-app/ui/components/chart";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

export type IntakeBucket = { label: string; count: number };
export type PatientsPerDoctor = { doctorId: string; doctorName: string; count: number };
export type ConditionBreakdown = { condition: string; count: number };

const intakeConfig = {
  count: { label: "New patients", color: "var(--chart-1)" },
} satisfies ChartConfig;

/** 12-month intake trend. */
export function IntakeLineChart({ buckets }: { buckets: IntakeBucket[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Patient intake — last 12 months</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={intakeConfig} className="h-64 w-full">
          <LineChart data={buckets} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={16} />
            <YAxis tickLine={false} axisLine={false} width={32} allowDecimals={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Line
              dataKey="count"
              type="monotone"
              stroke="var(--color-count)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

const perDoctorConfig = {
  count: { label: "Patients", color: "var(--chart-2)" },
} satisfies ChartConfig;

/** Workload distribution across the busiest doctors (horizontal bars). */
export function PatientsPerDoctorChart({ rows }: { rows: PatientsPerDoctor[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Patients per doctor{rows.length > 0 ? ` — top ${rows.length}` : ""}</CardTitle>
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
              width={120}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="count" fill="var(--color-count)" radius={2} />
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
      { label: row.condition, color: `var(--chart-${(index % 5) + 1})` },
    ]),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Patients by condition</CardTitle>
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
              innerRadius={60}
              outerRadius={95}
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
