import { z } from "zod";

/** Fixed portal-wide lists (GLOSSARY.md: Specialization, Condition). */
export const SPECIALIZATIONS = [
  "Cardiology",
  "Dermatology",
  "Neurology",
  "Orthopedics",
  "Pediatrics",
  "Psychiatry",
] as const;

export const CONDITIONS = [
  "Anemia",
  "Anxiety",
  "Arthritis",
  "Asthma",
  "Eczema",
  "Hypertension",
  "Migraine",
  "Type 2 Diabetes",
] as const;

export const GENDERS = ["female", "male", "other"] as const;

export const specializationSchema = z.enum(SPECIALIZATIONS);
export const conditionSchema = z.enum(CONDITIONS);
export const genderSchema = z.enum(GENDERS);
