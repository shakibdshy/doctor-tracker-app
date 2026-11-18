import { apiFetch } from "@/lib/api";

export type IntakeBucket = { label: string; count: number };
export type PatientsPerDoctor = { doctorId: string; doctorName: string; count: number };
export type ConditionBreakdown = { condition: string; count: number };

export type DashboardSummary = {
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

export function fetchDashboard() {
  return apiFetch<DashboardSummary>("/api/v1/dashboard");
}
