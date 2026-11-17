import { closeDb } from "@doctor-tracker-app/db";
import {
  Doctor,
  type DoctorDocument,
} from "@doctor-tracker-app/db/models/doctor.model";
import {
  Patient,
  type PatientDocument,
} from "@doctor-tracker-app/db/models/patient.model";
import { CONDITIONS, GENDERS, SPECIALIZATIONS } from "@doctor-tracker-app/db/schemas/enums";
import { ensureDemoUsers } from "./bootstrap-users";
import { faker } from "@faker-js/faker";

/**
 * Deterministic, re-runnable seed (spec, Seed & delivery): ~25 doctors and
 * ~900 patients spread across the last 12 months with realistic condition /
 * specialization distributions and a few unassigned patients, plus the demo
 * users. Wipes the doctor/patient collections first; demo users are upserted.
 *
 * Run with `bun run seed` (server workspace).
 */
const DOCTOR_COUNT = 25;
const PATIENT_COUNT = 900;
const UNASSIGNED_SHARE = 0.06;
const NOTES_SHARE = 0.25;

const HOSPITALS = [
  "St. Mary General",
  "Riverside Clinic",
  "Northside Medical",
  "Harbor Health",
  "Cedar Grove Hospital",
  "Lakeview Medical Center",
];

const pick = <T>(items: readonly T[], index: number): T =>
  items[index % items.length] as T;

const phoneNumber = () =>
  `+1 ${faker.string.numeric(3)}-${faker.string.numeric(3)}-${faker.string.numeric(4)}`;

faker.seed(1097);

const monthsAgo = (months: number) => {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  return date;
};

function slugify(hospital: string) {
  return hospital.toLowerCase().replace(/[^a-z]+/g, ".");
}

async function seedDoctors(): Promise<DoctorDocument[]> {
  const doctors = Array.from({ length: DOCTOR_COUNT }, (_, index) => {
    const name = faker.person.fullName();
    const hospital = pick(HOSPITALS, index);
    const specialization = pick(SPECIALIZATIONS, index);
    const email = `${slugify(name)}@${slugify(hospital)}.test`;
    return {
      name,
      nameLower: name.toLowerCase(),
      specialization,
      hospital,
      hospitalLower: hospital.toLowerCase(),
      phone: phoneNumber(),
      email,
      emailLower: email,
      createdAt: faker.date.between({ from: monthsAgo(12), to: new Date() }),
      updatedAt: new Date(),
    };
  });
  return Doctor.insertMany(doctors) as unknown as Promise<DoctorDocument[]>;
}

async function seedPatients(doctors: DoctorDocument[]): Promise<void> {
  const unassignedCount = Math.round(PATIENT_COUNT * UNASSIGNED_SHARE);
  const patients = Array.from({ length: PATIENT_COUNT }, (_, index) => {
    const name = faker.person.fullName();
    const assigned = index >= unassignedCount;
    const doctor = assigned ? faker.helpers.arrayElement(doctors) : null;
    // Weight intake toward recent months so trends read naturally.
    const recency = faker.number.int(100);
    const createdAt = faker.date.between({
      from: monthsAgo(recency < 40 ? 3 : recency < 70 ? 6 : 12),
      to: new Date(),
    });
    const phone = phoneNumber();
    return {
      name,
      nameLower: name.toLowerCase(),
      phone,
      phoneLower: phone.toLowerCase(),
      gender: faker.helpers.arrayElement(GENDERS),
      dateOfBirth: faker.date.birthdate({ mode: "age", min: 18, max: 85 }),
      condition: faker.helpers.arrayElement(CONDITIONS),
      doctor: doctor ? doctor._id : null,
      notes: faker.helpers.maybe(
        () => faker.lorem.sentence({ min: 4, max: 12 }),
        { probability: NOTES_SHARE },
      ),
      createdAt,
      updatedAt: createdAt,
    };
  });
  await Patient.insertMany(patients as unknown as PatientDocument[]);
}

// Re-runnable: wipe the care-records collections, keep auth users (upserted).
await Promise.all([Doctor.deleteMany({}), Patient.deleteMany({})]);

const doctorDocs = await seedDoctors();
await seedPatients(doctorDocs);
console.log(
  `[seed] ${doctorDocs.length} doctors, ${PATIENT_COUNT} patients across 12 months`,
);
await ensureDemoUsers();
await closeDb();
