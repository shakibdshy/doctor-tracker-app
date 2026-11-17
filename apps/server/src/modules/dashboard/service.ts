import { Patient } from "@doctor-tracker-app/db/models/patient.model";
import { Doctor } from "@doctor-tracker-app/db/models/doctor.model";

export type DashboardKpis = {
  totalDoctors: number;
  totalPatients: number;
  unassignedPatients: number;
  newPatientsThisMonth: number;
};

export type IntakeBucket = { label: string; count: number };
export type PatientsPerDoctor = { doctorId: string; doctorName: string; count: number };
export type ConditionBreakdown = { condition: string; count: number };

export type DashboardSummary = {
  kpis: DashboardKpis;
  monthlyIntake: IntakeBucket[];
  patientsPerDoctor: PatientsPerDoctor[];
  conditionBreakdown: ConditionBreakdown[];
};

const TOP_DOCTORS_LIMIT = 8;
const INTAKE_MONTHS = 12;

/** UTC start of the month 11 months back — the intake window's lower bound. */
function intakeFrom(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (INTAKE_MONTHS - 1), 1));
}

/** "Dec '25" — short, unambiguous bucket labels for the axis. */
function bucketLabel(date: Date): string {
  return (
    date.toLocaleDateString("en-CA", { month: "short", timeZone: "UTC" }) +
    " '" +
    String(date.getUTCFullYear()).slice(2)
  );
}

/**
 * Dashboard summary: every number is computed database-side by parallel
 * aggregation pipelines (spec, Data model & queries); Promise.all runs them
 * concurrently.
 */
export async function getDashboardSummary(): Promise<DashboardSummary> {
  const now = new Date();
  const thisMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const from = intakeFrom();

  const [totalDoctors, totalPatients, unassignedPatients, newPatientsThisMonth, monthly, perDoctor, conditions] =
    await Promise.all([
      Doctor.countDocuments({}),
      Patient.countDocuments({}),
      Patient.countDocuments({ doctor: null }),
      Patient.countDocuments({ createdAt: { $gte: thisMonthStart } }),

      // 12-month intake: group by calendar year+month after the range match.
      Patient.aggregate<{ _id: { year: number; month: number }; count: number }>([
        { $match: { createdAt: { $gte: from } } },
        {
          $group: {
            _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
      ]),

      // Top doctors by assignment count; names resolved in the pipeline.
      Patient.aggregate<{ _id: unknown; count: number; doctorName: string }>([
        { $match: { doctor: { $ne: null } } },
        { $group: { _id: "$doctor", count: { $sum: 1 } } },
        // Tie-break on _id so the top-8 cut is stable across runs.
        { $sort: { count: -1, _id: 1 } },
        { $limit: TOP_DOCTORS_LIMIT },
        {
          $lookup: {
            from: "doctors",
            localField: "_id",
            foreignField: "_id",
            as: "doctor",
          },
        },
        { $unwind: "$doctor" },
        { $project: { count: 1, doctorName: "$doctor.name" } },
        { $sort: { count: -1, doctorName: 1 } },
      ]),

      Patient.aggregate<{ _id: string; count: number }>([
        { $group: { _id: "$condition", count: { $sum: 1 } } },
        { $sort: { count: -1, _id: 1 } },
      ]),
    ]);

  // Presentation: fill the 12 buckets oldest→newest with zero months.
  const countByMonth = new Map(
    monthly.map((row) => [`${row._id.year}-${row._id.month}`, row.count]),
  );
  const monthlyIntake: IntakeBucket[] = [];
  for (let i = INTAKE_MONTHS - 1; i >= 0; i--) {
    const bucketDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const key = `${bucketDate.getUTCFullYear()}-${bucketDate.getUTCMonth() + 1}`;
    monthlyIntake.push({
      label: bucketLabel(bucketDate),
      count: countByMonth.get(key) ?? 0,
    });
  }

  return {
    kpis: { totalDoctors, totalPatients, unassignedPatients, newPatientsThisMonth },
    monthlyIntake,
    patientsPerDoctor: perDoctor.map((row) => ({
      doctorId: String(row._id),
      doctorName: row.doctorName,
      count: row.count,
    })),
    conditionBreakdown: conditions.map((row) => ({
      condition: row._id,
      count: row.count,
    })),
  };
}
