"use client";

import { Card, CardContent, CardHeader } from "@doctor-tracker-app/ui/components/card";
import { StatCard } from "@doctor-tracker-app/ui/components/stat-card";
import { Skeleton } from "@doctor-tracker-app/ui/components/skeleton";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@doctor-tracker-app/ui/components/empty";
import { Button } from "@doctor-tracker-app/ui/components/button";
import { ChartBarIcon, ChartPieIcon, StethoscopeIcon, TrendingUpIcon, RefreshCcwIcon, UserPlusIcon, UsersIcon, UserXIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";

import { apiFetch, apiErrorMessage } from "@/lib/api";
import type { ConditionBreakdown, IntakeBucket, PatientsPerDoctor } from "./dashboard-charts";

// Charts are client-only, code-split chunks: first paint renders the card
// frames and KPIs without the recharts bundle.
const IntakeLineChart = dynamic(
  () => import("./dashboard-charts").then((m) => m.IntakeLineChart),
  { ssr: false, loading: () => <ChartSkeleton /> },
);
const PatientsPerDoctorChart = dynamic(
  () => import("./dashboard-charts").then((m) => m.PatientsPerDoctorChart),
  { ssr: false, loading: () => <ChartSkeleton /> },
);
const ConditionDonut = dynamic(
  () => import("./dashboard-charts").then((m) => m.ConditionDonut),
  { ssr: false, loading: () => <ChartSkeleton /> },
);

type DashboardSummary = {
  kpis: {
    totalDoctors: number;
    totalPatients: number;
    unassignedPatients: number;
    newPatientsThisMonth: number;
  };
  monthlyIntake: IntakeBucket[];
  patientsPerDoctor: PatientsPerDoctor[];
  conditionBreakdown: ConditionBreakdown[];
};

function ChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-56" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-64 w-full" />
      </CardContent>
    </Card>
  );
}

function KpiSkeletons() {
  return (
    <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="gap-3 p-4">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-8 w-16" />
        </Card>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => apiFetch<DashboardSummary>("/api/v1/dashboard"),
  });

  if (error) {
    return (
      <Empty className="mt-6 border" role="alert">
        <EmptyHeader>
          <EmptyTitle>The dashboard could not be loaded</EmptyTitle>
          <EmptyDescription>
            {error instanceof Error ? error.message : "Something went wrong. Please try again."}
          </EmptyDescription>
          <Button variant="outline" onClick={() => void refetch()}>
            <RefreshCcwIcon data-icon="inline-start" />
            Retry
          </Button>
        </EmptyHeader>
      </Empty>
    );
  }

  if (isLoading || !data) {
    return (
      <>
        <KpiSkeletons />
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      </>
    );
  }

  const { kpis, monthlyIntake, patientsPerDoctor, conditionBreakdown } = data.data;
  const hasPatients = kpis.totalPatients > 0;

  return (
    <>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Total doctors"
          value={kpis.totalDoctors}
          icon={StethoscopeIcon}
          className="animate-rise"
        />
        <StatCard
          label="Total patients"
          value={kpis.totalPatients}
          icon={UsersIcon}
          className="animate-rise [animation-delay:60ms]"
        />
        <StatCard
          label="Unassigned patients"
          value={kpis.unassignedPatients}
          icon={UserXIcon}
          className="animate-rise [animation-delay:120ms]"
        />
        <StatCard
          label="New this month"
          value={kpis.newPatientsThisMonth}
          hint="Patient intake"
          icon={UserPlusIcon}
          className="animate-rise [animation-delay:180ms]"
        />
      </div>

      {hasPatients ? (
        <>
          <div className="animate-rise mt-4 min-w-0 [animation-delay:220ms]">
            <IntakeLineChart buckets={monthlyIntake} />
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="animate-rise min-w-0 [animation-delay:280ms]">
              <PatientsPerDoctorChart rows={patientsPerDoctor} />
            </div>
            <div className="animate-rise min-w-0 [animation-delay:340ms]">
              <ConditionDonut rows={conditionBreakdown} />
            </div>
          </div>
          {patientsPerDoctor.length === 0 || conditionBreakdown.length === 0 ? (
            <p className="text-muted-foreground mt-2 flex items-center gap-1.5 text-xs">
              <ChartBarIcon className="size-3.5" />
              <ChartPieIcon className="size-3.5" />
              Some charts have no data yet — they fill in as patients are added.
            </p>
          ) : null}
        </>
      ) : (
        <Empty className="mt-4 border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UsersIcon />
            </EmptyMedia>
            <EmptyTitle>No patients yet</EmptyTitle>
            <EmptyDescription>
              The intake trend, workload distribution, and condition mix appear once
              patients are added.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </>
  );
}
